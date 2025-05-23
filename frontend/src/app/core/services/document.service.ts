import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest, HttpEventType, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, throwError, from, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { Document, PresignedUrlResponse, PresignedDownloadUrlResponse } from '../models/';
import { environment } from '../../../environments/environment.development';
import * as crc32 from 'crc-32'; // Asegúrate de instalar crc-32
import { Buffer } from 'buffer'; // Asegúrate de instalar buffer
import { ErrorHandlerService } from './errorhandler.service';


@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private apiUrl = `${environment.apiUrl}/documents`;

  private handleError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  private handleFileError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getFileErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  // Obtener documentos de una carpeta
  getDocuments(folderId: string | null): Observable<Document[]> {
    let params = new HttpParams();
    if (folderId) {
      params = params.set('folderId', folderId);
    }
    // El backend debería interpretar la ausencia como la raíz
    return this.http.get<Document[]>(this.apiUrl, { params }).pipe(catchError(error => this.handleError(error)));
  }

  // Solicitar URL prefirmada para subida
  requestUploadUrl(filename: string, mimeType: string, folderId: string | null): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(`${this.apiUrl}/upload-url`, {
      filename,
      mimeType,
      folderId
    }).pipe(catchError(error => this.handleFileError(error)));
  }

  // --- Subir archivo directamente a S3 ---
  uploadFileToS3(signedUrl: string, file: File): Observable<number | HttpResponse<any>> {
    // Crear un subject para controlar el flujo y poder informar del progreso
    const progress$ = new Subject<number | HttpResponse<any>>();
    
    // Preparar la petición con los headers adecuados
    const headers = new HttpHeaders({ 
      'Content-Type': file.type,
      // No incluir más headers ya que pueden causar problemas con la firma
    });
    
    const req = new HttpRequest('PUT', signedUrl, file, {
      reportProgress: true,
      headers: headers
    });

    // Realizar la petición
    const subscription = this.http.request(req).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          // Calcular y emitir el progreso
          const percentDone = Math.round(100 * event.loaded / event.total);
          progress$.next(percentDone);
        } else if (event instanceof HttpResponse) {
          // Comprobar si la respuesta es satisfactoria (códigos 200-299)
          if (event.status >= 200 && event.status < 300) {
            // Emitir la respuesta completa para indicar éxito
            progress$.next(event);
            progress$.complete(); // Completar el observable para indicar finalización
          } else {
            // Error en la respuesta de S3
            progress$.error(new Error(`Error de S3: ${event.status} ${event.statusText}`));
          }
        }
      },
      error: (error) => {
        // Capturar cualquier error en la petición HTTP
        console.error('Error en la subida a S3:', error);
        progress$.error(error);
      },
      complete: () => {
        // Este callback se ejecuta si la petición HTTP completa sin emitir HttpResponse
        // No deberíamos llegar aquí en operaciones PUT normales, pero por si acaso
        console.log('Subida completada (sin respuesta HTTP)');
        // No hacemos progress$.complete() aquí para evitar doble completado
      }
    });

    // Devolver el observable y asegurarse de que la suscripción se limpia cuando se completa
    return progress$.asObservable().pipe(
      finalize(() => {
        subscription.unsubscribe(); // Limpiar la suscripción al HTTP request
      }),
      catchError(error => this.handleFileError(error))
    );
  }

  // Confirmar subida y guardar metadatos
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

  // Solicitar URL prefirmada para descarga
  requestDownloadUrl(documentId: string): Observable<PresignedDownloadUrlResponse> {
    return this.http.get<PresignedDownloadUrlResponse>(`${this.apiUrl}/${documentId}/download-url`).pipe(
      catchError(error => this.handleFileError(error)));
  }

  // Eliminar un documento
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${documentId}`).pipe(catchError(error => this.handleError(error)));
  }

  getAllUserDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/all`).pipe(catchError(error => this.handleError(error)));
  }

  moveDocument(documentId: string, destinationFolderId: string | null): Observable<Document> {
    const url = `${this.apiUrl}/${documentId}/move`;
    return this.http.patch<Document>(url, { destinationFolderId }).pipe(catchError(error => this.handleError(error)));
  }

  // Para obtener documentos recientes
  getRecentDocuments(limit: number = 5): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/recent?limit=${limit}`).pipe(catchError(error => this.handleError(error)));
  }
  
  // Para obtener documentos favoritos/destacados
  getFavoriteDocuments(limit: number = 5): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/favorites?limit=${limit}`).pipe(catchError(error => this.handleError(error)));
  }
  
  // Para estadísticas de documentos
  getDocumentStats(): Observable<{totalCount: number, totalSize: number}> {
    return this.http.get<{totalCount: number, totalSize: number}>(`${this.apiUrl}/stats`).pipe(catchError(error => this.handleError(error)));
  }
  
  // Para marcar/desmarcar un documento como favorito
  toggleFavorite(documentId: string, isFavorite: boolean): Observable<Document> {
    return this.http.patch<Document>(`${this.apiUrl}/${documentId}/favorite`, { isFavorite }).pipe(catchError(error => this.handleError(error)));
  }

  /**
 * Obtiene los detalles de un documento por su ID
 * @param documentId ID del documento
 * @returns Observable con los detalles del documento
 */
getDocumentById(documentId: string): Observable<Document> {
  return this.http.get<Document>(`${this.apiUrl}/${documentId}`).pipe(catchError(error => this.handleError(error)));
}

updateDocumentName(documentId: string, newName: string): Observable<Document> {
  return this.http.patch<Document>(`${this.apiUrl}/${documentId}/name`, { name: newName }).pipe(catchError(error => this.handleError(error)));
}
}