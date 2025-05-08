import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError, concatMap, reduce } from 'rxjs/operators';
import { Folder } from '../models/folder.model';
import { environment } from '../../../environments/environment.development'; // Asegúrate que exista environment

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/folders`; // Define apiUrl en environment.ts

  // Obtener carpetas de un directorio padre
  getFolders(parentId: string | null): Observable<Folder[]> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('parentId', parentId);
    } else {
      // Asegurarse que si parentId es null, no se envíe el parámetro
      // El backend debería interpretar la ausencia de parentId como la raíz
    }
    return this.http.get<Folder[]>(this.apiUrl, { params });
  }

  // Obtener detalles de una carpeta específica
  getFolderDetails(folderId: string): Observable<Folder> {
    return this.http.get<Folder>(`${this.apiUrl}/${folderId}`);
  }

  // Crear una nueva carpeta
  createFolder(name: string, parentId: string | null): Observable<Folder> {
    return this.http.post<Folder>(this.apiUrl, { name, parentId });
  }

  // Eliminar una carpeta
  deleteFolder(folderId: string): Observable<any> { // O define una interfaz para la respuesta
    return this.http.delete(`${this.apiUrl}/${folderId}`);
  }

  // --- Lógica para Breadcrumbs ---
  getBreadcrumbs(folderId: string | null): Observable<Folder[]> {
    if (!folderId) {
      return of([{ _id: '', name: 'Raíz', parentId: null, ownerId: '' }]); // Objeto 'Raíz' virtual
    }

    return this.buildBreadcrumbPath(folderId).pipe(
      map(path => [
        { _id: '', name: 'Raíz', parentId: null, ownerId: '' }, // Añadir raíz al inicio
        ...path.reverse() // Revertir para tener Raíz > CarpetaA > CarpetaB
      ])
    );
  }

  private buildBreadcrumbPath(folderId: string | null): Observable<Folder[]> {
      if (!folderId) {
          return of([]); // Caso base: llegamos a la raíz (o más allá)
      }

      return this.getFolderDetails(folderId).pipe(
          switchMap(folder => {
              // Llamada recursiva para el padre
              return this.buildBreadcrumbPath(folder.parentId).pipe(
                  map(parentPath => [...parentPath, folder]) // Añadir la carpeta actual al path
              );
          }),
          catchError(err => {
              console.error("Error fetching breadcrumb segment:", err);
              // Si no se encuentra una carpeta (ej. borrada), detener la cadena
              return of([]);
          })
      );
  }

}