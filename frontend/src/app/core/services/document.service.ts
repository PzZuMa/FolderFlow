import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest, HttpEventType, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Document, PresignedUrlResponse, PresignedDownloadUrlResponse } from '../models/';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/documents`;

  // Obtener documentos de una carpeta
  getDocuments(folderId: string | null): Observable<Document[]> {
    let params = new HttpParams();
    if (folderId) {
      params = params.set('folderId', folderId);
    }
    // El backend debería interpretar la ausencia como la raíz
    return this.http.get<Document[]>(this.apiUrl, { params });
  }

  // Solicitar URL prefirmada para subida
  requestUploadUrl(filename: string, mimeType: string, folderId: string | null): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(`${this.apiUrl}/upload-url`, {
      filename,
      mimeType,
      folderId
    });
  }

  // --- Subir archivo directamente a S3 ---
  uploadFileToS3(signedUrl: string, file: File): Observable<number | HttpResponse<any>> {
      const req = new HttpRequest('PUT', signedUrl, file, {
          reportProgress: true,
          headers: new HttpHeaders({ 'Content-Type': file.type }) // ¡IMPORTANTE!
          // No añadir 'Authorization' aquí
      });

      const progress = new Subject<number | HttpResponse<any>>();

      this.http.request(req).subscribe(
          event => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                  const percentDone = Math.round(100 * event.loaded / event.total);
                  progress.next(percentDone);
              } else if (event instanceof HttpResponse) {
                  if (event.status >= 200 && event.status < 300) {
                    progress.next(event); // Enviar la respuesta completa en éxito
                    progress.complete();
                  } else {
                    progress.error(event); // Propagar como error si S3 devuelve error
                  }
              }
          },
          error => {
              console.error('S3 Upload Error:', error);
              progress.error(error);
          }
      );
      return progress.asObservable();
  }


  // Confirmar subida y guardar metadatos
  confirmUpload(s3Key: string, name: string, mimeType: string, size: number, folderId: string | null): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/confirm-upload`, {
      s3Key,
      name,
      mimeType,
      size,
      folderId
    });
  }

  // Solicitar URL prefirmada para descarga
  requestDownloadUrl(documentId: string): Observable<PresignedDownloadUrlResponse> {
    return this.http.get<PresignedDownloadUrlResponse>(`${this.apiUrl}/${documentId}/download-url`);
  }

  // Eliminar un documento
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${documentId}`);
  }
}