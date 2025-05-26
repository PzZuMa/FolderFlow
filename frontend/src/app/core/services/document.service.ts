import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest, HttpEventType, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { Document, PresignedUrlResponse, PresignedDownloadUrlResponse } from '../models/';
import { environment } from '../../../environments/environment.development';
import { ErrorHandlerService } from './errorhandler.service';

/**
 * Servicio para gestionar documentos: subida, descarga, obtención, favoritos, mover, etc.
 * Incluye integración con S3 mediante URLs prefirmadas.
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private apiUrl = `${environment.apiUrl}/documents`;

  /**
   * Maneja errores generales y los transforma en mensajes amigables.
   */
  private handleError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Maneja errores específicos de archivos.
   */
  private handleFileError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getFileErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Obtiene los documentos de una carpeta específica (o raíz si folderId es null).
   */
  getDocuments(folderId: string | null): Observable<Document[]> {
    let params = new HttpParams();
    if (folderId) {
      params = params.set('folderId', folderId);
    }
    return this.http.get<Document[]>(this.apiUrl, { params }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Solicita una URL prefirmada para subir un archivo a S3.
   */
  requestUploadUrl(filename: string, mimeType: string, folderId: string | null): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(`${this.apiUrl}/upload-url`, {
      filename,
      mimeType,
      folderId
    }).pipe(catchError(error => this.handleFileError(error)));
  }

  /**
   * Sube un archivo a S3 usando la URL prefirmada y reporta el progreso.
   * Devuelve el porcentaje de progreso o la respuesta final de S3.
   */
  uploadFileToS3(signedUrl: string, file: File): Observable<number | HttpResponse<any>> {
    const progress$ = new Subject<number | HttpResponse<any>>();
    const headers = new HttpHeaders({
      'Content-Type': file.type
    });

    const req = new HttpRequest('PUT', signedUrl, file, {
      reportProgress: true,
      headers: headers
    });

    const subscription = this.http.request(req).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const percentDone = Math.round(100 * event.loaded / event.total);
          progress$.next(percentDone);
        } else if (event instanceof HttpResponse) {
          if (event.status >= 200 && event.status < 300) {
            progress$.next(event);
            progress$.complete();
          } else {
            progress$.error(new Error(`Error de S3: ${event.status} ${event.statusText}`));
          }
        }
      },
      error: (error) => {
        progress$.error(error);
      },
      complete: () => {
        // No se requiere acción adicional al completar.
      }
    });

    return progress$.asObservable().pipe(
      finalize(() => {
        subscription.unsubscribe();
      }),
      catchError(error => this.handleFileError(error))
    );
  }

  /**
   * Confirma la subida de un archivo a la API para registrar el documento.
   */
  confirmUpload(s3Key: string, name: string, mimeType: string, size: number, folderId: string | null): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/confirm-upload`, {
      s3Key,
      name,
      mimeType,
      size,
      folderId
    }).pipe(
      catchError(error => this.handleFileError(error)));
  }

  /**
   * Solicita una URL prefirmada para descargar un documento desde S3.
   */
  requestDownloadUrl(documentId: string): Observable<PresignedDownloadUrlResponse> {
    return this.http.get<PresignedDownloadUrlResponse>(`${this.apiUrl}/${documentId}/download-url`).pipe(
      catchError(error => this.handleFileError(error)));
  }

  /**
   * Elimina un documento por su ID.
   */
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${documentId}`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene todos los documentos del usuario (sin filtrar por carpeta).
   */
  getAllUserDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/all`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Mueve un documento a otra carpeta.
   */
  moveDocument(documentId: string, destinationFolderId: string | null): Observable<Document> {
    const url = `${this.apiUrl}/${documentId}/move`;
    return this.http.patch<Document>(url, { destinationFolderId }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene los documentos recientes del usuario (limitados por parámetro).
   */
  getRecentDocuments(limit: number = 5): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/recent?limit=${limit}`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene los documentos favoritos del usuario (limitados por parámetro).
   */
  getFavoriteDocuments(limit: number = 5): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/favorites?limit=${limit}`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene estadísticas globales de documentos del usuario.
   */
  getDocumentStats(): Observable<{ totalCount: number, totalSize: number }> {
    return this.http.get<{ totalCount: number, totalSize: number }>(`${this.apiUrl}/stats`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Marca o desmarca un documento como favorito.
   */
  toggleFavorite(documentId: string, isFavorite: boolean): Observable<Document> {
    return this.http.patch<Document>(`${this.apiUrl}/${documentId}/favorite`, { isFavorite }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene los detalles de un documento por su ID.
   */
  getDocumentById(documentId: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${documentId}`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Actualiza el nombre de un documento.
   */
  updateDocumentName(documentId: string, newName: string): Observable<Document> {
    return this.http.patch<Document>(`${this.apiUrl}/${documentId}/name`, { name: newName }).pipe(catchError(error => this.handleError(error)));
  }
}