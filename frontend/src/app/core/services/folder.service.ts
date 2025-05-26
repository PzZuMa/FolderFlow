import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { Folder } from '../models/folder.model';
import { environment } from '../../../environments/environment.development';
import { ErrorHandlerService } from './errorhandler.service';

/**
 * Servicio para gestionar operaciones relacionadas con carpetas:
 * creación, obtención, eliminación, movimiento y breadcrumbs.
 */
@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private apiUrl = `${environment.apiUrl}/folders`;

  /**
   * Maneja errores y los transforma en mensajes amigables para el usuario.
   * @param error Error recibido de la API.
   */
  private handleError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Obtiene las carpetas hijas de una carpeta dada (o raíz si parentId es null).
   * @param parentId ID de la carpeta padre o null para raíz.
   */
  getFolders(parentId: string | null): Observable<Folder[]> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('parentId', parentId);
    }
    return this.http.get<Folder[]>(this.apiUrl, { params }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene los detalles de una carpeta específica por su ID.
   * @param folderId ID de la carpeta.
   */
  getFolderDetails(folderId: string): Observable<Folder> {
    return this.http.get<Folder>(`${this.apiUrl}/${folderId}`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Crea una nueva carpeta bajo un padre dado.
   * @param name Nombre de la nueva carpeta.
   * @param parentId ID de la carpeta padre o null para raíz.
   */
  createFolder(name: string, parentId: string | null): Observable<Folder> {
    return this.http.post<Folder>(this.apiUrl, { name, parentId }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Elimina una carpeta por su ID.
   * @param folderId ID de la carpeta a eliminar.
   */
  deleteFolder(folderId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${folderId}`).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene la ruta de breadcrumbs desde la raíz hasta la carpeta indicada.
   * @param folderId ID de la carpeta destino o null para raíz.
   */
  getBreadcrumbs(folderId: string | null): Observable<Folder[]> {
    if (this.isRootId(folderId)) {
      // Si es raíz, retorna solo el breadcrumb raíz.
      return of([{ _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
    }

    // Construye la ruta recursivamente y la invierte para mostrar desde raíz hasta destino.
    return this.buildBreadcrumbPathRecursive(folderId).pipe(
      map(path => {
        const orderedPath = [...path].reverse();
        const rootCrumb: Folder = { _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' };
        return [rootCrumb, ...orderedPath];
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Construye recursivamente la ruta de breadcrumbs hacia arriba.
   * @param folderId ID de la carpeta actual.
   */
  private buildBreadcrumbPathRecursive(folderId: string | null): Observable<Folder[]> {
    if (this.isRootId(folderId)) {
      return of([]);
    }

    return this.getFolderDetails(folderId!).pipe(
      switchMap(currentFolder => {
        if (!currentFolder) {
          return of([]);
        }
        return this.buildBreadcrumbPathRecursive(currentFolder.parentId).pipe(
          map(parentPath => {
            return [currentFolder, ...parentPath];
          })
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Determina si el ID corresponde a la raíz.
   * @param id ID a comprobar.
   */
  private isRootId(id: string | null | undefined): boolean {
    return id === null || id === '' || id === undefined;
  }

  /**
   * Mueve una carpeta a otro padre.
   * @param folderId ID de la carpeta a mover.
   * @param destinationParentId ID del nuevo padre o null para raíz.
   */
  moveFolder(folderId: string, destinationParentId: string | null): Observable<Folder> {
    const url = `${this.apiUrl}/${folderId}/move`;
    return this.http.patch<Folder>(url, { destinationParentId }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene estadísticas de una carpeta (cantidad de elementos, tamaño, etc).
   * @param folderId ID de la carpeta o null para raíz.
   */
  getFolderStats(folderId?: string | null): Observable<any> {
    const params = folderId !== undefined
      ? new HttpParams().set('folderId', folderId || 'null')
      : new HttpParams();

    return this.http.get<any>(`${this.apiUrl}/stats`, { params }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Obtiene varias carpetas por sus IDs.
   * @param folderIds Array de IDs de carpetas.
   */
  getFoldersByIds(folderIds: string[]): Observable<Folder[]> {
    return this.http.post<Folder[]>(`${this.apiUrl}/by-ids`, { folderIds }).pipe(catchError(error => this.handleError(error)));
  }

  /**
   * Actualiza el nombre de una carpeta.
   * @param folderId ID de la carpeta.
   * @param newName Nuevo nombre.
   */
  updateFolderName(folderId: string, newName: string): Observable<Folder> {
    return this.http.patch<Folder>(`${this.apiUrl}/${folderId}/name`, { name: newName }).pipe(catchError(error => this.handleError(error)));
  }
}