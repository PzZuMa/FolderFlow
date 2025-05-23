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
    if (this.isRootId(folderId)) { // Usar el helper del componente o uno similar aquí
      return of([{ _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
    }

    return this.buildBreadcrumbPathRecursive(folderId).pipe(
      map(path => {
        // path aquí debería ser [CarpetaActual, Padre, Abuelo, ...]
        // Lo invertimos para que sea [..., Abuelo, Padre, CarpetaActual]
        const orderedPath = [...path].reverse(); 
        const rootCrumb: Folder = { _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' };
        console.debug('Breadcrumbs Service (Path Invertido + Raíz):', [rootCrumb, ...orderedPath].map(b => b.name));
        return [rootCrumb, ...orderedPath];
      }),
      catchError(error => {
        console.error('Error final en getBreadcrumbs:', error);
        return of([{ _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
      })
    );
  }

// Cambiado el nombre para claridad y lógica ajustada
  private buildBreadcrumbPathRecursive(folderId: string | null): Observable<Folder[]> {
    if (this.isRootId(folderId)) {
      return of([]); // Caso base: hemos llegado a la raíz (o más allá), no añadir más
    }

    return this.getFolderDetails(folderId!).pipe( // folderId no será null aquí
      switchMap(currentFolder => {
        if (!currentFolder) { // No se encontró la carpeta
          return of([]);
        }
        // Recursivamente obtener el path del padre
        return this.buildBreadcrumbPathRecursive(currentFolder.parentId).pipe(
          map(parentPath => {
            // Añadir la carpeta actual al final del path de sus padres
            // El orden se construye de la raíz hacia abajo: [Raíz, Padre, Actual]
            // No, al revés: [Actual, Padre, Abuelo]
            return [currentFolder, ...parentPath];
          })
        );
      }),
      catchError(err => {
        console.error(`Error fetching details for breadcrumb segment ${folderId}:`, err);
        return of([]); // Si un segmento falla, devolvemos un path vacío para ese punto
      })
      // No necesitas el timeout aquí si tu backend es razonablemente rápido y no hay ciclos.
    );
  }

  // Helper (puedes moverlo a un archivo de utilidades o mantenerlo aquí)
  private isRootId(id: string | null | undefined): boolean {
    return id === null || id === '' || id === undefined;
  }

  moveFolder(folderId: string, destinationParentId: string | null): Observable<Folder> {
    const url = `${this.apiUrl}/${folderId}/move`;
    return this.http.patch<Folder>(url, { destinationParentId }); // Enviar destino en el body
  }

  /**
 * Obtiene estadísticas de carpetas
 * @param folderId ID de la carpeta específica o undefined para estadísticas globales
 */
getFolderStats(folderId?: string | null): Observable<any> {
  const params = folderId !== undefined 
    ? new HttpParams().set('folderId', folderId || 'null') 
    : new HttpParams();
  
  return this.http.get<any>(`${this.apiUrl}/stats`, { params });
}

  getFoldersByIds(folderIds: string[]): Observable<Folder[]> {
  return this.http.post<Folder[]>(`${this.apiUrl}/by-ids`, { folderIds });
}

/**
 * Actualiza el nombre de una carpeta
 */
updateFolderName(folderId: string, newName: string): Observable<Folder> {
  return this.http.patch<Folder>(`${this.apiUrl}/${folderId}/name`, { name: newName });
}

}

