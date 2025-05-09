import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError, concatMap, reduce, timeout } from 'rxjs/operators';
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

  // Método mejorado para obtener breadcrumbs, más robusto ante errores
getBreadcrumbs(folderId: string | null): Observable<Folder[]> {
  // Caso especial: la raíz
  if (folderId === null || folderId === '' || folderId === undefined) {
    return of([{ _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
  }

  // Para cualquier carpeta que no sea la raíz, construir el camino completo
  return this.buildBreadcrumbPath(folderId).pipe(
    map(path => {
      // Añadir el elemento raíz al principio
      const rootCrumb: Folder = { _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' };
      
      // Si el path está vacío (posiblemente por un error), devolver solo la raíz
      if (!path || path.length === 0) {
        return [rootCrumb];
      }
      
      // Caso normal: raíz + path invertido (de raíz hacia abajo)
      return [rootCrumb, ...path.reverse()];
    }),
    // Asegurar que siempre devolvemos algo (al menos la raíz) incluso en caso de error
    catchError(error => {
      console.error('Error in getBreadcrumbs:', error);
      return of([{ _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
    })
  );
}

// Método auxiliar mejorado
private buildBreadcrumbPath(folderId: string | null): Observable<Folder[]> {
  // Caso base: llegamos a la raíz o hay un error
  if (!folderId || folderId === '') {
    return of([]);
  }

  return this.getFolderDetails(folderId).pipe(
    switchMap(folder => {
      // Continuar construyendo el path recursivamente con el padre
      return this.buildBreadcrumbPath(folder.parentId).pipe(
        map(parentPath => [...parentPath, folder])
      );
    }),
    // Manejo robusto de errores
    catchError(err => {
      console.error("Error fetching breadcrumb segment:", err);
      // Si no se puede encontrar una carpeta, detener la cadena aquí
      return of([]);
    }),
    // Timeout para evitar recursión infinita
    timeout(10000)
  );
}

}