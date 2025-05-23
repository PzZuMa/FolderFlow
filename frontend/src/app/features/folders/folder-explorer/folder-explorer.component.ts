// src/app/features/folder-explorer/folder-explorer.component.ts
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
  private folderService = inject(FolderService);
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private userPreferencesService = inject(UserPreferencesService);
  private errorHandler = inject(ErrorHandlerService);


  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  currentFolderId: string | null = null;
  parentOfCurrentFolderId: string | null = null;
  folders: FolderWithCounts[] = [];
  documents: Document[] = [];
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];
  breadcrumbs: Folder[] = []; // Inicializar vacío, se llenará con la raíz en ngOnInit
  viewType: 'grid' | 'list' = 'grid'; // Por defecto mostramos la vista de cuadrícula

  get currentFolderNameDisplay(): string {
    if (this.isLoading) {
      return 'Cargando...';
    }
    // Si currentFolderId es null, estamos en la raíz. El nombre viene del primer breadcrumb.
    if (this.currentFolderId === null && this.breadcrumbs.length > 0) {
      return this.breadcrumbs[0]?.name || 'Mis Carpetas'; // Usar el nombre del breadcrumb raíz
    }
    // Si estamos en una carpeta, el nombre es el del último breadcrumb.
    if (this.breadcrumbs.length > 0) {
      return this.breadcrumbs[this.breadcrumbs.length - 1]?.name || 'Error';
    }
    return 'Mis Carpetas'; // Fallback
  }

  ngOnInit(): void {
    this.viewType = this.userPreferencesService.getViewType();

    this.loadContents(null); // Cargar la raíz inicialmente
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadContents(folderId: string | null): void {
  this.isLoading = true;
  this.currentFolderId = folderId;
  this.uploads = [];
  this.folders = [];
  this.documents = [];
  // No reseteamos breadcrumbs aquí, esperamos la respuesta del servicio.
  this.cdRef.markForCheck();

  forkJoin({
    folders: this.folderService.getFolders(folderId),
    documents: this.documentService.getDocuments(folderId),
    breadcrumbs: this.folderService.getBreadcrumbs(folderId) // Confiamos en este servicio para el orden
  }).pipe(
    takeUntil(this.destroy$),
    catchError(error => {
      console.error('Error loading contents:', error);
      this.showError('Error al cargar el contenido.');
      // Estado de error para breadcrumbs
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
    
    // Filtrar documentos que tienen carpeta asignada
    this.documents = result.documents.filter(document => 
      document.folderId !== null && 
      document.folderId !== undefined && 
      document.folderId !== ''
    );
    
    this.loadFolderStats();

    if (result.breadcrumbs && result.breadcrumbs.length > 0) {
      // ***** CAMBIO IMPORTANTE: Asignar directamente, sin invertir *****
      this.breadcrumbs = result.breadcrumbs;

      // Asegurar que la raíz siempre tenga el nombre correcto si es el primer elemento
      // y si su ID es reconocido como raíz por isRootId.
      // Esto es importante si el servicio devuelve un nombre genérico para la raíz
      // o si quieres forzar un nombre específico.
      if (this.breadcrumbs.length > 0 && this.isRootId(this.breadcrumbs[0]?._id)) {
        this.breadcrumbs[0].name = 'Mis Carpetas'; // Nombre deseado para la raíz
      }

      // Determinar el ID del padre para el botón "atrás"
      // Esta lógica ahora debería funcionar correctamente si los breadcrumbs están en orden.
      if (this.currentFolderId === null) { // Estamos en la raíz (el ID de la carpeta actual es null)
        this.parentOfCurrentFolderId = null;
      } else if (this.breadcrumbs.length > 1) {
        // Si hay más de un breadcrumb, el padre es el penúltimo
        // El array es [Raíz, ..., Padre, Actual]
        // El índice del padre es breadcrumbs.length - 2
        const parentIndex = this.breadcrumbs.length - 2;
        const parentCrumb = this.breadcrumbs[parentIndex];
        this.parentOfCurrentFolderId = this.isRootId(parentCrumb._id) ? null : parentCrumb._id;
      } else {
        // Estamos en una carpeta (currentFolderId no es null), pero solo hay un breadcrumb.
        // Esto implicaría que es una carpeta de primer nivel, y su padre es la raíz.
        this.parentOfCurrentFolderId = null;
      }
    } else {
      // Fallback si el servicio de breadcrumbs no devuelve nada
      this.breadcrumbs = [{ _id: null as any, name: 'Mis Carpetas', parentId: null, ownerId: '' }];
      this.parentOfCurrentFolderId = null;
    }
    
    console.debug('Breadcrumbs (Componente):', this.breadcrumbs.map(b => `${b.name} (${b._id || 'root'})`).join(' > '));
    console.debug('Parent ID para "Atrás":', this.parentOfCurrentFolderId);
    this.cdRef.markForCheck();

    this.originalFolders = [...this.folders];
    this.originalDocuments = [...this.documents];
    this.filteredFolders = [...this.folders];
    this.filteredDocuments = [...this.documents];
  });
}

  navigateToFolder(folderId: string | null): void { // Permitir null para la raíz
      this.loadContents(folderId);
  }

  navigateUp(): void {
    // this.parentOfCurrentFolderId ya fue calculado en loadContents
    // Si es null, loadContents(null) cargará la raíz.
    this.loadContents(this.parentOfCurrentFolderId);
  }

  openDocumentViewer(document: Document): void {
    this.router.navigate(['/documents/view', document._id]);
  }

  navigateToBreadcrumb(folderId: string | null): void {
    // Normalizar el ID
    const targetId = this.isRootId(folderId) ? null : folderId;
    
    // Evitar carga innecesaria si ya estamos en esa carpeta
    if (targetId !== this.currentFolderId) {
      this.loadContents(targetId);
    }
  }

  // Método para cambiar el tipo de vista
  setViewType(type: 'grid' | 'list'): void {
    if (this.viewType !== type) {
      this.viewType = type;
      // Save the preference
      this.userPreferencesService.saveViewType(type);
      this.cdRef.markForCheck();
    }
  }

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
              console.error('Error creating folder:', err);
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

  triggerFileInputClick(): void {
    if (this.fileInput && this.fileInput.nativeElement) { 
        this.fileInput.nativeElement.click();
    }
  }

  private loadFolderStats(): void {
  if (!this.folders || this.folders.length === 0) return;
  
  const folderStatsRequests = this.folders.map(folder => 
    this.folderService.getFolderStats(folder._id).pipe(
      map(stats => ({folderId: folder._id, stats})),
      catchError(error => {
        console.error(`Error loading stats for folder ${folder._id}:`, error);
        return of({folderId: folder._id, stats: {folderCount: 0, fileCount: 0}});
      })
    )
  );
  
  forkJoin(folderStatsRequests)
    .pipe(takeUntil(this.destroy$))
    .subscribe(results => {
      // Update folders with real counts
      this.folders = this.folders.map(folder => {
        const folderStats = results.find(r => r.folderId === folder._id);
        return {
          ...folder,
          folderCount: folderStats?.stats.folderCount || 0,
          fileCount: folderStats?.stats.fileCount || 0
        };
      });
      
      // Update original folders collection as well
      this.originalFolders = [...this.folders];
      this.filteredFolders = [...this.folders];
      this.cdRef.markForCheck();
    });
  }

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

  private updateFolderName(folder: Folder, newName: string): void {
    this.isLoading = true;
    this.cdRef.markForCheck();

    this.folderService.updateFolderName(folder._id, newName)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error updating folder name:', err);
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
        // Actualizar la carpeta en las listas
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
          upload.s3Key = response.s3Key; // Guardar s3Key para la confirmación
          this.cdRef.markForCheck();
          
          // Devolver el observable de la subida a S3
          return this.documentService.uploadFileToS3(response.signedUrl, upload.file).pipe(
            // Manejar errores específicos de la subida a S3
            catchError(err => {
              console.error('Error uploading to S3:', err);
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
            // Actualizar el porcentaje de progreso
            upload.progress = event;
            this.cdRef.markForCheck();
          } 
          else if (event instanceof HttpResponse) {
            // Subida a S3 completada exitosamente
            upload.status = 'confirming';
            upload.progress = 100;
            this.cdRef.markForCheck();
            
            // Paso 3: Confirmar la subida en nuestro backend
            this.confirmUploadBackend(upload);
          }
        },
        error: (err) => {
          // Este error solo ocurre si hay un problema no capturado en los catchError anteriores
          console.error('Unexpected error in upload process:', err);
          if (upload.status !== 'error') { // Evitar doble seteo
            upload.status = 'error';
            upload.error = 'Error inesperado durante el proceso de subida.';
            this.cdRef.markForCheck();
          }
        }
      });
  }

  loadBreadcrumbs(folderId: string | null): void {
    this.folderService.getBreadcrumbs(folderId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading breadcrumbs:', error);
          // En caso de error, establecer al menos la raíz
          return of([{ _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' }]);
        })
      )
      .subscribe(breadcrumbs => {
        // Asegurarse de que siempre haya al menos un elemento (la raíz)
        if (!breadcrumbs || breadcrumbs.length === 0) {
          this.breadcrumbs = [{ _id: '', name: 'Mis Carpetas', parentId: null, ownerId: '' }];
        } else {
          this.breadcrumbs = breadcrumbs;
        }
        
        // Después de cargar los breadcrumbs, calcular el parentId para la navegación "arriba"
        this.calculateParentFolderId();
        this.cdRef.markForCheck();
      });
  }
  
  // Método auxiliar para calcular el padre de la carpeta actual
  private calculateParentFolderId(): void {
    if (this.currentFolderId === null) {
      // Estamos en la raíz, no hay padre
      this.parentOfCurrentFolderId = null;
    } else if (this.breadcrumbs.length > 1) {
      // Si hay más de un breadcrumb, el padre es el penúltimo
      const parentCrumb = this.breadcrumbs[this.breadcrumbs.length - 2];
      // Manejo unificado de IDs vacíos o nulos
      this.parentOfCurrentFolderId = this.isRootId(parentCrumb._id) ? null : parentCrumb._id;
    } else {
      // Fallback: si estamos en un folder pero solo tenemos un breadcrumb, asumimos que el padre es la raíz
      this.parentOfCurrentFolderId = null;
    }
  }
  
  // Método de utilidad para validar IDs que representan la raíz
  isRootId(id: string | null | undefined): boolean {
    return id === null || id === '' || id === undefined;
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
          window.open(response.downloadUrl, '_blank');
      });
  }

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
  private deleteItem(item: Folder | Document, itemType: 'folder' | 'document'): void {
    this.isLoading = true;
    this.cdRef.markForCheck();

    const deleteObservable = itemType === 'folder'
      ? this.folderService.deleteFolder(item._id)
      : this.documentService.deleteDocument(item._id);

    deleteObservable.pipe(
      catchError(err => {
        console.error(`Error deleting ${itemType}:`, err);
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

  openMoveDialog(item: Folder | Document, itemType: 'folder' | 'document'): void {
    console.log(`Abriendo diálogo para mover ${itemType}: ${item.name}`);
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
            console.log(`Mover ${itemType} ${item._id} a carpeta destino: ${result.destinationFolderId}`);
            this.moveItem(item, itemType, result.destinationFolderId); 
        } else {
            console.log('Diálogo de mover cerrado sin confirmar.');
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
            return EMPTY; // Detener el flujo en caso de error
        }),
        finalize(() => {
            this.isLoading = false;
            this.cdRef.markForCheck();
        })
    ).subscribe(() => {
        this.showSuccess(`'${item.name}' movido con éxito.`);
        // Recargar el contenido de la carpeta actual para reflejar el cambio
        // (el item ya no debería estar aquí si se movió a otro sitio)
        // Si se movió a una subcarpeta de la actual, no se verá el cambio inmediato hasta navegar allí.
        this.loadContents(this.currentFolderId);
    });
}

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
  
  getColorForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '25, 91, 255'; // Azul para imágenes
    if (mimeType === 'application/pdf') return '239, 71, 58'; // Rojo para PDF
    if (mimeType.startsWith('video/')) return '92, 107, 192'; // Morado para videos
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword') return '33, 150, 243'; // Azul para documentos Word
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        mimeType === 'application/vnd.ms-excel') return '46, 125, 50'; // Verde para Excel
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
        mimeType === 'application/vnd.ms-powerpoint') return '230, 81, 0'; // Naranja para PowerPoint
    if (mimeType === 'text/plain') return '117, 117, 117'; // Gris para texto plano
    if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed') return '121, 85, 72'; // Marrón para archivos comprimidos
    
    // Color por defecto
    return '100, 116, 139'; // Gris azulado
  }

  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }
  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
  }
  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-info'] });
  }


  filteredFolders: FolderWithCounts[] = [];
  filteredDocuments: Document[] = [];
  originalFolders: FolderWithCounts[] = [];
  originalDocuments: Document[] = [];

// Añade este método para filtrar elementos
filterItems(event: Event): void {
  const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
  
  if (!searchTerm) {
    this.folders = [...this.originalFolders];
    this.documents = [...this.originalDocuments];
  } else {
    this.folders = this.originalFolders.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm)
    );
    // Mantener el filtro de documentos con carpeta asignada
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

}