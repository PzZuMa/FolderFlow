/**
 * Componente explorador de documentos.
 * Permite listar, buscar, filtrar, subir, mover, eliminar y marcar como favorito documentos y carpetas.
 * Gestiona la vista en modo grid/list y preferencias del usuario.
 */
import { MatMenuModule } from '@angular/material/menu';
import { Folder, Document, UploadStatus } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, inject, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Observable, EMPTY, of } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { DocumentService } from '../../../core/services/document.service';
import { FolderService } from '../../../core/services/folder.service';
import { MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult } from '../../../shared/components/move-item-dialog/move-item-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { UserPreferencesService } from '../../../core/services/preferences.service';
import { ErrorHandlerService } from '../../../core/services/errorhandler.service';

@Component({
  selector: 'app-document-explorer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatMenuModule,
    MatCardModule,
    MatTooltipModule 
  ],
  templateUrl: './document-explorer.component.html',
  styleUrls: ['./document-explorer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentExplorerComponent implements OnInit, OnDestroy {
  // Servicios y dependencias inyectadas
  private folderService = inject(FolderService);
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private errorHandler = inject(ErrorHandlerService);
  private router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private userPreferencesService = inject(UserPreferencesService);

  // Referencia al input de archivos para subida
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Estado de la vista y datos
  currentFolderId: string | null = null;
  folders: Folder[] = [];
  documents: Document[] = [];
  breadcrumbs: Folder[] = [];
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];
  viewType: 'grid' | 'list' = 'grid';
  showOnlyFavorites: boolean = false;
  searchTerm: string = '';
  filteredDocuments: Document[] = [];
  originalDocuments: Document[] = [];
  folderMap: Map<string, string> = new Map();

  ngOnInit(): void {
    // Carga preferencias y documentos al iniciar
    this.viewType = this.userPreferencesService.getViewType();
    this.showOnlyFavorites = this.userPreferencesService.getFavoritesFilter();
    this.loadAllDocuments();
  }

  setViewType(type: 'grid' | 'list'): void {
    // Cambia el tipo de vista y guarda la preferencia
    if (this.viewType !== type) {
      this.viewType = type;
      this.userPreferencesService.saveViewType(type);
      this.cdRef.markForCheck();
    }
  }

  ngOnDestroy(): void {
    // Limpia recursos al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  openMoveDialog(item: Folder | Document, itemType: 'folder' | 'document'): void {
    // Abre el diálogo para mover carpetas o documentos
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
      } else {
        this.showError('No se seleccionó una carpeta de destino válida.');
      }
    });
  }

  triggerFileInputClick(): void {
    // Dispara el input de archivos para subir documentos
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    // Maneja la selección de archivos para subir
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

  private startUploadProcess(upload: UploadStatus): void {
    // Inicia el proceso de subida de un archivo
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
              upload.error = 'Error al subir el archivo a S3.';
              this.cdRef.markForCheck();
              return EMPTY;
            })
          );
        })
      )
      .subscribe({
        next: (event) => {
          upload.status = 'success';
          upload.progress = 100;
          this.confirmUploadBackend(upload);
          this.cdRef.detectChanges();
          setTimeout(() => {
            const index = this.uploads.indexOf(upload);
            if (index > -1) {
              this.uploads.splice(index, 1);
              this.cdRef.markForCheck();
            }
          }, 2000);
        },
        error: (err) => {
          if (upload.status !== 'error') {
            upload.status = 'error';
            upload.error = 'Error inesperado durante la subida.';
            this.cdRef.markForCheck();
          }
        }
      });
  }

  private moveItem(item: Folder | Document, itemType: 'folder' | 'document', destinationFolderId: string | null): void {
    // Mueve una carpeta o documento a otra carpeta
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
      this.loadAllDocuments();
    });
  }

  private confirmUploadBackend(upload: UploadStatus): void {
    // Confirma la subida del archivo en el backend tras subirlo a S3
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
      this.loadAllDocuments();
    });
  }

  downloadFile(document: Document): void {
    // Descarga un documento usando una URL prefirmada
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

  openDeleteConfirmation(item: Folder | Document, itemType: 'folder' | 'document'): void {
    // Abre el diálogo de confirmación para eliminar carpetas o documentos
    const dialogData: ConfirmationDialogData = {
      title: `Eliminar ${itemType === 'folder' ? 'Carpeta' : 'Archivo'}`,
      message: `¿Estás seguro de que deseas eliminar "${item.name}"? ${itemType === 'folder' ? 'Todo su contenido también será eliminado.' : ''}`,
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

  private deleteItem(item: Folder | Document, itemType: 'folder' | 'document'): void {
    // Elimina una carpeta o documento
    this.isLoading = true;
    this.cdRef.markForCheck();

    const deleteObservable = itemType === 'folder'
      ? this.folderService.deleteFolder(item._id)
      : this.documentService.deleteDocument(item._id);

    deleteObservable.pipe(
      catchError(err => {
        const message = err.error?.message?.includes('not empty')
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
      this.loadAllDocuments();
    });
  }

  getIconForMimeType(mimeType: string): string {
    // Devuelve el icono adecuado según el tipo MIME
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('video/')) return 'video_library';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.includes('word')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'analytics';
    if (mimeType.includes('powerpoint')) return 'slideshow';
    return 'article';
  }

  formatBytes(bytes: number, decimals = 2): string {
    // Formatea bytes a una cadena legible (KB, MB, etc.)
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private showSuccess(message: string): void {
    // Muestra un mensaje de éxito en un snackbar
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }

  private showError(message: string): void {
    // Muestra un mensaje de error en un snackbar
    this.snackBar.open(message, 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
  }

  filterDocuments(event: Event): void {
    // Filtra documentos por término de búsqueda
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.applyDocumentFilters();
  }

  toggleFavoritesFilter(): void {
    // Activa/desactiva el filtro de favoritos y guarda la preferencia
    this.showOnlyFavorites = !this.showOnlyFavorites;
    this.userPreferencesService.saveFavoritesFilter(this.showOnlyFavorites);
    this.applyDocumentFilters();
  }

  applyDocumentFilters(): void {
    // Aplica los filtros de favoritos y búsqueda a la lista de documentos
    let result = [...this.originalDocuments];
    if (this.showOnlyFavorites) {
      result = result.filter(doc => doc.isFavorite);
    }
    if (this.searchTerm) {
      result = result.filter(doc =>
        doc.name.toLowerCase().includes(this.searchTerm)
      );
    }
    this.documents = result;
    this.cdRef.markForCheck();
  }

  getFolderName(folderId: string): string {
    // Devuelve el nombre de una carpeta por su ID
    return this.folderMap.get(folderId) || 'Carpeta';
  }

  loadAllDocuments(): void {
    // Carga todas las carpetas y documentos del usuario
    this.isLoading = true;
    this.uploads = [];
    this.cdRef.markForCheck();

    this.folderService.getFolders(this.currentFolderId).pipe(
      takeUntil(this.destroy$),
      switchMap(folders => {
        this.folders = folders;
        this.folderMap.clear();
        this.folders.forEach(folder => {
          this.folderMap.set(folder._id, folder.name);
        });
        return this.documentService.getAllUserDocuments().pipe(
          catchError(error => {
            this.showError('Error al cargar los documentos.');
            return of([]);
          })
        );
      }),
      switchMap(docs => {
        const missingFolderIds = new Set<string>();
        docs.forEach(doc => {
          if (doc.folderId && !this.folderMap.has(doc.folderId)) {
            missingFolderIds.add(doc.folderId);
          }
        });
        if (missingFolderIds.size > 0) {
          return this.folderService.getFoldersByIds(Array.from(missingFolderIds)).pipe(
            map(additionalFolders => {
              additionalFolders.forEach(folder => {
                this.folderMap.set(folder._id, folder.name);
              });
              return docs;
            }),
            catchError(error => {
              return of(docs);
            })
          );
        }
        return of(docs);
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(docs => {
      this.originalDocuments = [...docs];
      this.applyDocumentFilters();
      this.cdRef.markForCheck();
    });
  }

  toggleViewType(): void {
    // Cambia entre vista grid y lista
    this.viewType = this.viewType === 'grid' ? 'list' : 'grid';
    this.cdRef.markForCheck();
  }

  openDocumentViewer(document: Document): void {
    // Navega al visor de documentos para el documento seleccionado
    this.router.navigate(['/documents/view', document._id]);
  }

  toggleFavorite(doc: Document, event: Event): void {
    // Marca o desmarca un documento como favorito
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
          this.applyDocumentFilters();
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

  getColorForMimeType(mimeType: string): string {
    // Devuelve un color asociado al tipo MIME para iconos o etiquetas
    if (mimeType.startsWith('image/')) return '#10b981';
    if (mimeType === 'application/pdf') return '#ef4444';
    if (mimeType.startsWith('video/')) return '#3b82f6';
    if (mimeType.startsWith('audio/')) return '#f59e0b';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '#8b5cf6';
    if (mimeType.includes('word')) return '#2563eb';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#22c55e';
    if (mimeType.includes('powerpoint')) return '#f97316';
    if (mimeType.includes('text/')) return '#6b4fbb';
    return '#64748b';
  }
}