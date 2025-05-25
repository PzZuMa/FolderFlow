import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { Folder } from '../models/folder.model';
import { environment } from '../../../environments/environment.development';
import { ErrorHandlerService } from './errorhandler.service';

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);
  private apiUrl = `${environment.apiUrl}/folders`;

  private handleError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  getFolders(parentId: string | null): Observable<Folder[]> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('parentId', parentId);
    }
    return this.http.get<Folder[]>(this.apiUrl, { params }).pipe(catchError(error => this.handleError(error)));
  }

  getFolderDetails(folderId: string): Observable<Folder> {
    return this.http.get<Folder>(`${this.apiUrl}/${folderId}`).pipe(catchError(error => this.handleError(error)));
  }

  createFolder(name: string, parentId: string | null): Observable<Folder> {
    return this.http.post<Folder>(this.apiUrl, { name, parentId }).pipe(catchError(error => this.handleError(error)));
  }

  deleteFolder(folderId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${folderId}`).pipe(catchError(error => this.handleError(error)));
  }

  getBreadcrumbs(folderId: string | null): Observable<Folder[]> {
    if (this.isRootId(folderId)) {
      return of([{ _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
    }

    return this.buildBreadcrumbPathRecursive(folderId).pipe(
      map(path => {
        const orderedPath = [...path].reverse();
        const rootCrumb: Folder = { _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' };
        return [rootCrumb, ...orderedPath];
      }),
      catchError(error => this.handleError(error))
    );
  }

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

  private isRootId(id: string | null | undefined): boolean {
    return id === null || id === '' || id === undefined;
  }

  moveFolder(folderId: string, destinationParentId: string | null): Observable<Folder> {
    const url = `${this.apiUrl}/${folderId}/move`;
    return this.http.patch<Folder>(url, { destinationParentId }).pipe(catchError(error => this.handleError(error)));
  }

  getFolderStats(folderId?: string | null): Observable<any> {
    const params = folderId !== undefined
      ? new HttpParams().set('folderId', folderId || 'null')
      : new HttpParams();

    return this.http.get<any>(`${this.apiUrl}/stats`, { params }).pipe(catchError(error => this.handleError(error)));
  }

  getFoldersByIds(folderIds: string[]): Observable<Folder[]> {
    return this.http.post<Folder[]>(`${this.apiUrl}/by-ids`, { folderIds }).pipe(catchError(error => this.handleError(error)));
  }

  updateFolderName(folderId: string, newName: string): Observable<Folder> {
    return this.http.patch<Folder>(`${this.apiUrl}/${folderId}/name`, { name: newName }).pipe(catchError(error => this.handleError(error)));
  }
}