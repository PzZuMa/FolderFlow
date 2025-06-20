/**
 * Componente explorador de carpetas.
 * Permite navegar, crear, renombrar, mover, eliminar carpetas y subir documentos.
 * Gestiona la vista en modo grid/list y preferencias del usuario.
 */
import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, forkJoin, of, Subject, EMPTY } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { Folder, Document, UploadStatus } from '../../../core/models';
import { FolderService } from '../../../core/services/folder.service';
import { DocumentService } from '../../../core/services/document.service';
import { CreateFolderDialogComponent } from '../../../shared/components/create-folder-dialog/create-folder-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult } from '../../../shared/components/move-item-dialog/move-item-dialog.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { UserPreferencesService } from '../../../core/services/preferences.service';
import { RenameFolderDialogComponent, RenameFolderDialogData } from '../../../shared/components/rename-folder-dialog/rename-folder-dialog.component';
import { ErrorHandlerService } from '../../../core/services/errorhandler.service';

/**
 * Extiende Folder para incluir contadores de archivos y subcarpetas.
 */
interface FolderWithCounts extends Folder {
  fileCount?: number;
  folderCount?: number;
}

@Component({
  selector: 'app-folder-explorer',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatIconModule, MatButtonModule, MatToolbarModule,
    MatDialogModule, MatProgressBarModule, MatSnackBarModule, MatMenuModule,
    MatCardModule, MatTooltipModule, MatDividerModule, MatListModule
  ],
  templateUrl: './folder-explorer.component.html',
  styleUrls: ['./folder-explorer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderExplorerComponent implements OnInit, OnDestroy {
  // Servicios y dependencias inyectadas
  private folderService = inject(FolderService);
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private userPreferencesService = inject(UserPreferencesService);
  private errorHandler = inject(ErrorHandlerService);

  // Referencia al input de archivos para subida
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Estado de la vista y datos
  currentFolderId: string | null = null;
  parentOfCurrentFolderId: string | null = null;
  folders: FolderWithCounts[] = [];
  documents: Document[] = [];
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];
  breadcrumbs: Folder[] = [];
  viewType: 'grid' | 'list' = 'grid';

  // Listas auxiliares para filtrado y búsqueda
  filteredFolders: FolderWithCounts[] = [];
  filteredDocuments: Document[] = [];
  originalFolders: FolderWithCounts[] = [];
  originalDocuments: Document[] = [];

  /**
   * Devuelve el nombre de la carpeta actual para mostrar en la cabecera.
   */
  get currentFolderNameDisplay(): string {
    if (this.isLoading) {
      return 'Cargando...';
    }
    if (this.currentFolderId === null && this.breadcrumbs.length > 0) {
      return this.breadcrumbs[0]?.name || 'Mis Carpetas';
    }
    if (this.breadcrumbs.length > 0) {
      return this.breadcrumbs[this.breadcrumbs.length - 1]?.name || 'Error';
    }
    return 'Mis Carpetas';
  }

  ngOnInit(): void {
    // Carga preferencias y contenido inicial
    this.viewType = this.userPreferencesService.getViewType();
    this.loadContents(null);
  }

  ngOnDestroy(): void {
    // Limpia recursos al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga carpetas, documentos y breadcrumbs de la carpeta actual.
   */
  loadContents(folderId: string | null): void {
    this.isLoading = true;
    this.currentFolderId = folderId;
    this.uploads = [];
    this.folders = [];
    this.documents = [];
    this.cdRef.markForCheck();

    forkJoin({
      folders: this.folderService.getFolders(folderId),
      documents: this.documentService.getDocuments(folderId),
      breadcrumbs: this.folderService.getBreadcrumbs(folderId)
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.showError('Error al cargar el contenido.');
        this.breadcrumbs = [{ _id: null as any, name: 'Error', parentId: null, ownerId: '' }];
        this.parentOfCurrentFolderId = null;
        return of({ folders: [], documents: [], breadcrumbs: this.breadcrumbs });
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(result => {
      this.folders = result.folders as FolderWithCounts[];
      this.documents = result.documents.filter(document =>
        document.folderId !== null &&
        document.folderId !== undefined &&
        document.folderId !== ''
      );
      this.loadFolderStats();
      if (result.breadcrumbs && result.breadcrumbs.length > 0) {
        this.breadcrumbs = result.breadcrumbs;
        if (this.breadcrumbs.length > 0 && this.isRootId(this.breadcrumbs[0]?._id)) {
          this.breadcrumbs[0].name = 'Mis Carpetas';
        }
        if (this.currentFolderId === null) {
          this.parentOfCurrentFolderId = null;
        } else if (this.breadcrumbs.length > 1) {
          const parentIndex = this.breadcrumbs.length - 2;
          const parentCrumb = this.breadcrumbs[parentIndex];
          this.parentOfCurrentFolderId = this.isRootId(parentCrumb._id) ? null : parentCrumb._id;
        } else {
          this.parentOfCurrentFolderId = null;
        }
      } else {
        this.breadcrumbs = [{ _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' }];
        this.parentOfCurrentFolderId = null;
      }
      this.cdRef.markForCheck();
      this.originalFolders = [...this.folders];
      this.originalDocuments = [...this.documents];
      this.filteredFolders = [...this.folders];
      this.filteredDocuments = [...this.documents];
    });
  }

  /**
   * Navega a una carpeta hija.
   */
  navigateToFolder(folderId: string | null): void {
    this.loadContents(folderId);
  }

  /**
   * Navega a la carpeta padre.
   */
  navigateUp(): void {
    this.loadContents(this.parentOfCurrentFolderId);
  }

  /**
   * Abre el visor de documentos para el documento seleccionado.
   */
  openDocumentViewer(document: Document): void {
    this.router.navigate(['/documents/view', document._id]);
  }

  /**
   * Navega a una carpeta desde el breadcrumb.
   */
  navigateToBreadcrumb(folderId: string | null): void {
    const targetId = this.isRootId(folderId) ? null : folderId;
    if (targetId !== this.currentFolderId) {
      this.loadContents(targetId);
    }
  }

  /**
   * Cambia el tipo de vista y guarda la preferencia.
   */
  setViewType(type: 'grid' | 'list'): void {
    if (this.viewType !== type) {
      this.viewType = type;
      this.userPreferencesService.saveViewType(type);
      this.cdRef.markForCheck();
    }
  }

  /**
   * Abre el diálogo para crear una nueva carpeta.
   */
  openCreateFolderDialog(): void {
    const dialogRef = this.dialog.open(CreateFolderDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(folderName => {
      if (folderName) {
        this.isLoading = true;
        this.cdRef.markForCheck();
        this.folderService.createFolder(folderName, this.currentFolderId)
          .pipe(
            catchError(err => {
              this.showError(`Error al crear la carpeta: ${err.error?.message || err.message}`);
              return EMPTY;
            }),
            finalize(() => {
              this.isLoading = false;
              this.cdRef.markForCheck();
            })
          )
          .subscribe(() => {
            this.showSuccess('Carpeta creada exitosamente.');
            this.loadContents(this.currentFolderId);
          });
      }
    });
  }

  /**
   * Dispara el input de archivos para subir documentos.
   */
  triggerFileInputClick(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Carga estadísticas de archivos y subcarpetas para cada carpeta.
   */
  private loadFolderStats(): void {
    if (!this.folders || this.folders.length === 0) return;
    const folderStatsRequests = this.folders.map(folder =>
      this.folderService.getFolderStats(folder._id).pipe(
        map(stats => ({ folderId: folder._id, stats })),
        catchError(error => {
          return of({ folderId: folder._id, stats: { folderCount: 0, fileCount: 0 } });
        })
      )
    );
    forkJoin(folderStatsRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.folders = this.folders.map(folder => {
          const folderStats = results.find(r => r.folderId === folder._id);
          return {
            ...folder,
            folderCount: folderStats?.stats.folderCount || 0,
            fileCount: folderStats?.stats.fileCount || 0
          };
        });
        this.originalFolders = [...this.folders];
        this.filteredFolders = [...this.folders];
        this.cdRef.markForCheck();
      });
  }

  /**
   * Maneja la selección de archivos para subir.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const files = Array.from(input.files);
    input.value = '';
    files.forEach(file => {
      const uploadStatus: UploadStatus = {
        file: file,
        progress: 0,
        status: 'pending'
      };
      this.uploads.push(uploadStatus);
      this.cdRef.markForCheck();
      this.startUploadProcess(uploadStatus);
    });
  }

  /**
   * Abre el diálogo para renombrar una carpeta.
   */
  openEditFolderNameDialog(folder: Folder, event: Event): void {
    event.stopPropagation();
    const dialogData: RenameFolderDialogData = {
      folderName: folder.name,
      folderId: folder._id
    };
    const dialogRef = this.dialog.open(RenameFolderDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: true
    });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(newName => {
      if (newName && newName !== folder.name) {
        this.updateFolderName(folder, newName);
      }
    });
  }

  /**
   * Actualiza el nombre de una carpeta.
   */
  private updateFolderName(folder: Folder, newName: string): void {
    this.isLoading = true;
    this.cdRef.markForCheck();
    this.folderService.updateFolderName(folder._id, newName)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          const message = err.error?.message || 'Error al actualizar el nombre de la carpeta';
          this.showError(message);
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdRef.markForCheck();
        })
      )
      .subscribe(updatedFolder => {
        const originalIndex = this.originalFolders.findIndex(f => f._id === updatedFolder._id);
        if (originalIndex !== -1) {
          this.originalFolders[originalIndex] = { ...this.originalFolders[originalIndex], ...updatedFolder };
        }
        const index = this.folders.findIndex(f => f._id === updatedFolder._id);
        if (index !== -1) {
          this.folders[index] = { ...this.folders[index], ...updatedFolder };
        }
        const filteredIndex = this.filteredFolders.findIndex(f => f._id === updatedFolder._id);
        if (filteredIndex !== -1) {
          this.filteredFolders[filteredIndex] = { ...this.filteredFolders[filteredIndex], ...updatedFolder };
        }
        this.showSuccess(`Carpeta renombrada a "${updatedFolder.name}"`);
        this.cdRef.markForCheck();
      });
  }

  /**
   * Inicia el proceso de subida de un archivo.
   */
  private startUploadProcess(upload: UploadStatus): void {
    upload.status = 'pending';
    this.cdRef.markForCheck();
    this.documentService.requestUploadUrl(upload.file.name, upload.file.type, this.currentFolderId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          upload.status = 'error';
          upload.error = 'No se pudo obtener la URL de subida.';
          this.cdRef.markForCheck();
          return EMPTY;
        }),
        switchMap(response => {
          upload.status = 'uploading';
          upload.s3Key = response.s3Key;
          this.cdRef.markForCheck();
          return this.documentService.uploadFileToS3(response.signedUrl, upload.file).pipe(
            catchError(err => {
              upload.status = 'error';
              upload.error = 'Error durante la subida del archivo a S3.';
              this.cdRef.markForCheck();
              return EMPTY;
            })
          );
        })
      )
      .subscribe({
        next: (event) => {
          if (typeof event === 'number') {
            upload.progress = event;
            this.cdRef.markForCheck();
          }
          else if (event instanceof HttpResponse) {
            upload.status = 'confirming';
            upload.progress = 100;
            this.cdRef.markForCheck();
            this.confirmUploadBackend(upload);
          }
        },
        error: (err) => {
          if (upload.status !== 'error') {
            upload.status = 'error';
            upload.error = 'Error inesperado durante el proceso de subida.';
            this.cdRef.markForCheck();
          }
        }
      });
  }

  /**
   * Carga los breadcrumbs de la carpeta actual.
   */
  loadBreadcrumbs(folderId: string | null): void {
    this.folderService.getBreadcrumbs(folderId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          return of([{ _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
        })
      )
      .subscribe(breadcrumbs => {
        if (!breadcrumbs || breadcrumbs.length === 0) {
          this.breadcrumbs = [{ _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' }];
        } else {
          this.breadcrumbs = breadcrumbs;
        }
        this.calculateParentFolderId();
        this.cdRef.markForCheck();
      });
  }

  /**
   * Calcula el ID de la carpeta padre a partir de los breadcrumbs.
   */
  private calculateParentFolderId(): void {
    if (this.currentFolderId === null) {
      this.parentOfCurrentFolderId = null;
    } else if (this.breadcrumbs.length > 1) {
      const parentCrumb = this.breadcrumbs[this.breadcrumbs.length - 2];
      this.parentOfCurrentFolderId = this.isRootId(parentCrumb._id) ? null : parentCrumb._id;
    } else {
      this.parentOfCurrentFolderId = null;
    }
  }

  /**
   * Determina si el ID corresponde a la raíz.
   */
  isRootId(id: string | null | undefined): boolean {
    return id === null || id === '' || id === undefined;
  }

  /**
   * Confirma la subida del archivo en el backend tras subirlo a S3.
   */
  private confirmUploadBackend(upload: UploadStatus): void {
    if (!upload.s3Key) {
      upload.status = 'error';
      upload.error = 'Falta S3 Key para confirmar.';
      this.cdRef.markForCheck();
      return;
    }
    this.documentService.confirmUpload(
      upload.s3Key,
      upload.file.name,
      upload.file.type,
      upload.file.size,
      this.currentFolderId
    ).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        upload.status = 'error';
        upload.error = 'Error al confirmar la subida en el servidor.';
        this.cdRef.markForCheck();
        return EMPTY;
      })
    ).subscribe(() => {
      upload.status = 'success';
      this.cdRef.markForCheck();
      this.showSuccess(`'${upload.file.name}' subido correctamente.`);
      this.loadContents(this.currentFolderId);
    });
  }

  /**
   * Descarga un documento usando una URL prefirmada.
   */
  downloadFile(document: Document): void {
    this.documentService.requestDownloadUrl(document._id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          this.showError('No se pudo obtener el enlace de descarga.');
          return EMPTY;
        })
      )
      .subscribe(response => {
        window.open(response.downloadUrl, '_blank');
      });
  }

  /**
   * Abre el diálogo de confirmación para eliminar carpetas o documentos.
   */
  openDeleteConfirmation(item: Folder | Document, itemType: 'folder' | 'document'): void {
    const dialogData: ConfirmationDialogData = {
      title: `Eliminar ${itemType === 'folder' ? 'Carpeta' : 'Archivo'}`,
      message: `¿Estás seguro de que deseas eliminar "${item.name}"? ${itemType === 'folder' ? 'Si la carpeta contiene elementos, la eliminación podría fallar o eliminar su contenido dependiendo de la lógica del backend.' : ''}`,
      confirmButtonText: 'Eliminar',
    };
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (confirmed) {
        this.deleteItem(item, itemType);
      }
    });
  }

  /**
   * Elimina una carpeta o documento.
   */
  private deleteItem(item: Folder | Document, itemType: 'folder' | 'document'): void {
    this.isLoading = true;
    this.cdRef.markForCheck();
    const deleteObservable = itemType === 'folder'
      ? this.folderService.deleteFolder(item._id)
      : this.documentService.deleteDocument(item._id);
    deleteObservable.pipe(
      catchError(err => {
        const message = err.error?.message?.includes('not empty') || err.error?.message?.includes('vacía')
          ? 'No se puede eliminar una carpeta que no está vacía.'
          : `Error al eliminar ${itemType === 'folder' ? 'la carpeta' : 'el archivo'}.`;
        this.showError(message);
        return EMPTY;
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(() => {
      this.showSuccess(`${itemType === 'folder' ? 'Carpeta' : 'Archivo'} eliminado correctamente.`);
      this.loadContents(this.currentFolderId);
    });
  }

  /**
   * Abre el diálogo para mover carpetas o documentos.
   */
  openMoveDialog(item: Folder | Document, itemType: 'folder' | 'document'): void {
    const dialogData: MoveItemDialogData = {
      itemToMove: item,
      itemType: itemType,
      currentFolderId: this.currentFolderId
    };
    const dialogRef = this.dialog.open<MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult>(
      MoveItemDialogComponent,
      {
        width: '500px',
        data: dialogData,
        disableClose: true
      }
    );
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && result.destinationFolderId !== undefined) {
        this.moveItem(item, itemType, result.destinationFolderId);
      }
    });
  }

  /**
   * Mueve una carpeta o documento a otra carpeta.
   */
  private moveItem(item: Folder | Document, itemType: 'folder' | 'document', destinationFolderId: string | null): void {
    this.isLoading = true;
    this.cdRef.markForCheck();
    let moveObservable: Observable<Folder | Document>;
    if (itemType === 'folder') {
      moveObservable = this.folderService.moveFolder(item._id, destinationFolderId);
    } else {
      moveObservable = this.documentService.moveDocument(item._id, destinationFolderId);
    }
    moveObservable.pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        this.showError(err.error?.message || `Error al mover ${itemType === 'folder' ? 'la carpeta' : 'el archivo'}.`);
        return EMPTY;
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(() => {
      this.showSuccess(`'${item.name}' movido con éxito.`);
      this.loadContents(this.currentFolderId);
    });
  }

  /**
   * Devuelve el icono adecuado según el tipo MIME.
   */
  getIconForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') return 'article';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') return 'assessment';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || mimeType === 'application/vnd.ms-powerpoint') return 'slideshow';
    if (mimeType === 'text/plain') return 'description';
    if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed') return 'archive';
    return 'insert_drive_file';
  }

  /**
   * Devuelve un color asociado al tipo MIME para iconos o etiquetas.
   */
  getColorForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '25, 91, 255';
    if (mimeType === 'application/pdf') return '239, 71, 58';
    if (mimeType.startsWith('video/')) return '92, 107, 192';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') return '33, 150, 243';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel') return '46, 125, 50';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint') return '230, 81, 0';
    if (mimeType === 'text/plain') return '117, 117, 117';
    if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed') return '121, 85, 72';
    return '100, 116, 139';
  }

  /**
   * Formatea bytes a una cadena legible (KB, MB, etc.).
   */
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Muestra un mensaje de éxito en un snackbar.
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }
  /**
   * Muestra un mensaje de error en un snackbar.
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
  }
  /**
   * Muestra un mensaje informativo en un snackbar.
   */
  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-info'] });
  }

  /**
   * Filtra carpetas y documentos por término de búsqueda.
   */
  filterItems(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    if (!searchTerm) {
      this.folders = [...this.originalFolders];
      this.documents = [...this.originalDocuments];
    } else {
      this.folders = this.originalFolders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm)
      );
      this.documents = this.originalDocuments.filter(document =>
        document.name.toLowerCase().includes(searchTerm) &&
        document.folderId !== null &&
        document.folderId !== undefined &&
        document.folderId !== ''
      );
    }
    this.cdRef.markForCheck();
  }

  /**
   * Marca o desmarca un documento como favorito.
   */
  toggleFavorite(doc: Document, event: Event): void {
    event.stopPropagation();
    const newStatus = !doc.isFavorite;
    this.documentService.toggleFavorite(doc._id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          const originalIndex = this.originalDocuments.findIndex(d => d._id === updatedDoc._id);
          if (originalIndex !== -1) {
            this.originalDocuments[originalIndex] = updatedDoc;
          }
          const index = this.documents.findIndex(d => d._id === updatedDoc._id);
          if (index !== -1) {
            this.documents[index] = updatedDoc;
          }
          const message = newStatus
            ? `"${doc.name}" añadido a favoritos`
            : `"${doc.name}" eliminado de favoritos`;
          this.showSuccess(message);
          this.cdRef.markForCheck();
        },
        error: (error) => {
          this.showError('No se pudo cambiar el estado de favorito');
        }
      });
  }
}