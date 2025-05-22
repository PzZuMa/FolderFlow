import { MatMenuModule } from '@angular/material/menu'; // Para menú contextual opcional
import { Folder, Document, UploadStatus } from '../../../core/models'; // Importa todas
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
import { DocumentService} from '../../../core/services/document.service';
import { FolderService } from '../../../core/services/folder.service';
import { MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult } from '../../../shared/components/move-item-dialog/move-item-dialog.component';
import { HttpResponse } from '@angular/common/http';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { UserPreferencesService } from '../../../core/services/preferences.service';


@Component({
  selector: 'app-document-explorer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Si usas routerLink para breadcrumbs
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatMenuModule, // Para menú contextual opcional
    MatCardModule,
    MatTooltipModule 
  ],
  templateUrl: './document-explorer.component.html',
  styleUrls: ['./document-explorer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Usar OnPush para mejor rendimiento
})
export class DocumentExplorerComponent implements OnInit {
  private folderService = inject(FolderService);
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute); // Para leer parámetros de ruta si decides usarlos
  private router = inject(Router); // Para navegar programáticamente si es necesario
  private cdRef = inject(ChangeDetectorRef); // Para marcar cambios manualmente con OnPush
  private destroy$ = new Subject<void>(); // Para limpiar suscripciones
  private userPreferencesService = inject(UserPreferencesService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>; // Para el input file oculto

  currentFolderId: string | null = null; // null para la raíz
  folders: Folder[] = [];
  documents: Document[] = [];
  breadcrumbs: Folder[] = [];
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];
  
  // Nuevas propiedades para controlar las vistas
  viewType: 'grid' | 'list' = 'grid'; // Por defecto vista de cuadrícula
  showOnlyFavorites: boolean = false; // Por defecto mostrar todos los documentos
  searchTerm: string = ''; // Para mantener el término de búsqueda actual
  
  filteredDocuments: Document[] = [];
  originalDocuments: Document[] = [];
  folderMap: Map<string, string> = new Map();;

  ngOnInit(): void {
    // Escuchar cambios en los parámetros de ruta si usas rutas tipo /app/folders/:folderId
    // this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
    //   this.currentFolderId = params.get('folderId'); // Obtiene el ID de la URL
    //   this.loadContents(this.currentFolderId);
    // });

    this.viewType = this.userPreferencesService.getViewType();
    this.showOnlyFavorites = this.userPreferencesService.getFavoritesFilter();

    // O si no usas parámetros de ruta, carga la raíz inicialmente
    this.loadAllDocuments();
  }

  // Reemplazar el método toggleViewType con setViewType
  setViewType(type: 'grid' | 'list'): void {
    if (this.viewType !== type) {
      this.viewType = type;
      this.userPreferencesService.saveViewType(type);
      this.cdRef.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openMoveDialog(item: Folder | Document, itemType: 'folder' | 'document'): void {
    console.log(`Abriendo diálogo para mover ${itemType}: ${item.name}`);

    const dialogData: MoveItemDialogData = {
        itemToMove: item,
        itemType: itemType,
        currentFolderId: this.currentFolderId // Pasamos la carpeta actual del EXPLORER
    };

    const dialogRef = this.dialog.open<MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult>(
        MoveItemDialogComponent, // <<< El componente de diálogo
        {
            width: '500px', // Ancho del diálogo
            data: dialogData, // <<< Los datos que necesita el diálogo
            disableClose: true // Evita cerrar haciendo clic fuera
        }
    );

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
        // 'result' será de tipo MoveItemDialogResult | undefined
        if (result && result.destinationFolderId !== undefined) {
            this.moveItem(item, itemType, result.destinationFolderId);
        } else {
            this.showError('No se seleccionó una carpeta de destino válida.');
        }
    });
  }

  // --- Subida de Archivos ---
  triggerFileInputClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const files = Array.from(input.files);
    // Resetear input para permitir seleccionar el mismo archivo de nuevo
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
    upload.status = 'pending'; // Estado inicial mientras se obtiene URL
    this.cdRef.markForCheck();
  
    // Paso 1: Solicitar URL prefirmada
    this.documentService.requestUploadUrl(upload.file.name, upload.file.type, this.currentFolderId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error getting upload URL:', err);
          upload.status = 'error';
          upload.error = 'No se pudo obtener la URL de subida.';
          this.cdRef.markForCheck();
          return EMPTY;
        }),
        // Paso 2: Subir a S3 con la URL obtenida
        switchMap(response => {
          upload.status = 'uploading';
          upload.s3Key = response.s3Key;          this.cdRef.markForCheck();
          
          // Devolver el observable de la subida a S3
          return this.documentService.uploadFileToS3(response.signedUrl, upload.file).pipe(
            catchError(err => {
              console.error('Error uploading file to S3:', err);
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
          if (typeof event === 'number') {
            // Actualizar el progreso de la subida
            upload.progress = event;
            this.cdRef.markForCheck();
          } 
          else if (event instanceof HttpResponse) {
            // Subida completada, confirmar en backend
            this.confirmUploadBackend(upload);
          }
        },
        error: (err) => {
          // Este error solo ocurre si hay un problema no capturado en los catchError anteriores
          console.error('Unexpected error in upload process:', err);
          if (upload.status !== 'error') {
            upload.status = 'error';
            upload.error = 'Error inesperado durante la subida.';
            this.cdRef.markForCheck();
          }
        }
      });
  }

  private moveItem(item: Folder | Document, itemType: 'folder' | 'document', destinationFolderId: string | null): void {
    console.log(`Ejecutando movimiento de ${itemType} ${item._id} a carpeta destino: ${destinationFolderId}`);
    this.isLoading = true; // Mostrar indicador de carga
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
            console.error(`Error moving ${itemType}:`, err);
            this.showError(err.error?.message || `Error al mover ${itemType === 'folder' ? 'la carpeta' : 'el archivo'}.`);
            return EMPTY;        }),
        finalize(() => {
            this.isLoading = false;
            this.cdRef.markForCheck();
        })
    ).subscribe(() => {
        this.showSuccess(`'${item.name}' movido con éxito.`);
        // Recargar el contenido de la carpeta actual para reflejar el cambio
        // (el item ya no debería estar aquí si se movió a otro sitio)
        // Si se movió a una subcarpeta de la actual, no se verá el cambio inmediato hasta navegar allí.
        this.loadAllDocuments();
    });
}

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
              console.error('Error confirming upload:', err);
              upload.status = 'error';
              upload.error = 'Error al confirmar la subida en el servidor.';
              // TODO: Considerar borrar el objeto de S3 si la confirmación falla (rollback)
              this.cdRef.markForCheck();
              return EMPTY;
          })
      ).subscribe(() => {
          upload.status = 'success';
          this.cdRef.markForCheck();
          this.showSuccess(`'${upload.file.name}' subido correctamente.`);
          // Podríamos quitar la subida exitosa de la lista después de un tiempo
          // O recargar todo, aunque puede ser pesado si hay muchas subidas
          this.loadAllDocuments();      });
  }

  // --- Descarga de Archivos ---
  downloadFile(document: Document): void {
    this.documentService.requestDownloadUrl(document._id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error getting download URL:', err);
          this.showError('No se pudo obtener el enlace de descarga.');
          return EMPTY;
        })
      )
      .subscribe(response => {
        // Abrir en nueva pestaña (o usar técnica de enlace <a>)
         window.open(response.downloadUrl, '_blank');
        // Alternativa: Crear enlace y simular clic
        // const link = document.createElement('a');
        // link.href = response.downloadUrl;
        // // link.download = document.name; // S3 ya debería añadir Content-Disposition
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
      });
  }

  // --- Eliminación ---
  openDeleteConfirmation(item: Folder | Document, itemType: 'folder' | 'document'): void {
    const dialogData: ConfirmationDialogData = {
      title: `Eliminar ${itemType === 'folder' ? 'Carpeta' : 'Archivo'}`,
      message: `¿Estás seguro de que deseas eliminar "${item.name}"? ${itemType === 'folder' ? 'Todo su contenido también será eliminado.' : ''}`, // Ajustar mensaje si la eliminación de carpetas no es recursiva en backend
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
    this.isLoading = true;
    this.cdRef.markForCheck();

    const deleteObservable = itemType === 'folder'
      ? this.folderService.deleteFolder(item._id)
      : this.documentService.deleteDocument(item._id);

    deleteObservable.pipe(
      catchError(err => {
        console.error(`Error deleting ${itemType}:`, err);
        // Revisar el error específico, ej. carpeta no vacía
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
      this.loadAllDocuments();    });
  }

  // --- Utilidades ---
  getIconForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('video/')) return 'video_library';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.includes('word')) return 'description'; // O un icono específico de Word si lo tienes
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'analytics'; // O icono Excel
    if (mimeType.includes('powerpoint')) return 'slideshow'; // O icono PPT
    return 'article'; // Icono por defecto
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
  }

  // Método actualizado para filtrar documentos con múltiples criterios
  filterDocuments(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.applyDocumentFilters();
  }
  
  // Nuevo método para alternar entre mostrar todos o solo favoritos
  toggleFavoritesFilter(): void {
    this.showOnlyFavorites = !this.showOnlyFavorites;
    this.userPreferencesService.saveFavoritesFilter(this.showOnlyFavorites);
    this.applyDocumentFilters();
  }
  
  // Método para aplicar todos los filtros activos
  applyDocumentFilters(): void {
    let result = [...this.originalDocuments];
    
    // Aplicar filtro de favoritos si está activo
    if (this.showOnlyFavorites) {
      result = result.filter(doc => doc.isFavorite);
    }
    
    // Aplicar filtro de búsqueda si hay un término
    if (this.searchTerm) {
      result = result.filter(doc => 
        doc.name.toLowerCase().includes(this.searchTerm)
      );
    }
    
    this.documents = result;
    this.cdRef.markForCheck();
  }

  // Función auxiliar para obtener el nombre de la carpeta
  getFolderName(folderId: string): string {
    return this.folderMap.get(folderId) || 'Carpeta';
  }

  // Modificar el método loadAllDocuments cerca de la línea 390-430
loadAllDocuments(): void {
  this.isLoading = true;
  this.uploads = [];
  this.cdRef.markForCheck();

  // Primero cargar las carpetas para llenar el folderMap
  this.folderService.getFolders(this.currentFolderId).pipe(
    takeUntil(this.destroy$),
    switchMap(folders => {
      this.folders = folders;
      
      // Primero llenamos el mapa con las carpetas actuales
      this.folderMap.clear();
      this.folders.forEach(folder => {
        this.folderMap.set(folder._id, folder.name);
      });
      
      // Luego cargamos documentos
      return this.documentService.getAllUserDocuments().pipe(
        catchError(error => {
          console.error('Error loading all documents:', error);
          this.showError('Error al cargar los documentos.');
          return of([]);
        })
      );
    }),
    // Actualizar datos de carpetas para documentos que puedan estar en otras carpetas
    switchMap(docs => {
      // Recopilar IDs únicos de carpetas que no estén en el mapa actual
      const missingFolderIds = new Set<string>();
      docs.forEach(doc => {
        if (doc.folderId && !this.folderMap.has(doc.folderId)) {
          missingFolderIds.add(doc.folderId);
        }
      });
      
      // Si hay carpetas faltantes, obtenerlas
      if (missingFolderIds.size > 0) {
        return this.folderService.getFoldersByIds(Array.from(missingFolderIds)).pipe(
          map(additionalFolders => {
            // Añadir las carpetas adicionales al mapa
            additionalFolders.forEach(folder => {
              this.folderMap.set(folder._id, folder.name);
            });
            return docs;
          }),
          catchError(error => {
            console.error('Error loading additional folders:', error);
            return of(docs); // Seguir con los documentos aunque falle la carga de carpetas
          })
        );
      }
      
      // Si no hay carpetas faltantes, seguir con los documentos
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
  
  // Método para alternar tipo de vista
  toggleViewType(): void {
    this.viewType = this.viewType === 'grid' ? 'list' : 'grid';
    this.cdRef.markForCheck();
  }

  openDocumentViewer(document: Document): void {
    this.router.navigate(['/documents/view', document._id]);
  }

 /**
 * Marca o desmarca un documento como favorito
 */
toggleFavorite(doc: Document, event: Event): void {
  event.stopPropagation();
  
  const newStatus = !doc.isFavorite;
  
  this.documentService.toggleFavorite(doc._id, newStatus)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedDoc) => {
        // Actualizar el documento en la lista original
        const originalIndex = this.originalDocuments.findIndex(d => d._id === updatedDoc._id);
        if (originalIndex !== -1) {
          this.originalDocuments[originalIndex] = updatedDoc;
        }
        
        // Actualizar el documento en la lista filtrada si está en uso
        const index = this.documents.findIndex(d => d._id === updatedDoc._id);
        if (index !== -1) {
          this.documents[index] = updatedDoc;
        }
        
        // Volver a aplicar filtros para actualizar la vista correctamente
        this.applyDocumentFilters();
        
        const message = newStatus 
          ? `"${doc.name}" añadido a favoritos` 
          : `"${doc.name}" eliminado de favoritos`;
        
        this.showSuccess(message);
        this.cdRef.markForCheck();
      },
      error: (error) => {
        console.error('Error al cambiar estado de favorito:', error);
        this.showError('No se pudo cambiar el estado de favorito');
      }
    });
}

  /**
   * Devuelve un color según el tipo de archivo
   */
  getColorForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '#10b981'; // verde para imágenes
    if (mimeType === 'application/pdf') return '#ef4444'; // rojo para PDF
    if (mimeType.startsWith('video/')) return '#3b82f6'; // azul para videos
    if (mimeType.startsWith('audio/')) return '#f59e0b'; // naranja para audio
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '#8b5cf6';
    if (mimeType.includes('word')) return '#2563eb'; // azul para Word
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#22c55e'; // verde para Excel
    if (mimeType.includes('powerpoint')) return '#f97316'; // naranja para PowerPoint
    if (mimeType.includes('text/')) return '#6b4fbb'; // púrpura para texto
    return '#64748b'; // color por defecto (gris)
  }
}