// src/app/features/folder-explorer/folder-explorer.component.ts
import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';

import { Folder, Document, UploadStatus } from '../../../core/models';
import { FolderService } from '../../../core/services/folder.service';
import { DocumentService } from '../../../core/services/document.service';
import { CreateFolderDialogComponent } from '../../../shared/components/create-folder-dialog/create-folder-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult } from '../../../shared/components/move-item-dialog/move-item-dialog.component';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-folder-explorer',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatIconModule, MatButtonModule, MatToolbarModule,
    MatDialogModule, MatProgressBarModule, MatSnackBarModule, MatMenuModule,
    MatCardModule, MatTooltipModule, MatDividerModule
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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  currentFolderId: string | null = null;
  parentOfCurrentFolderId: string | null = null;
  folders: Folder[] = [];
  documents: Document[] = [];
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];
  breadcrumbs: Folder[] = []; // Inicializar vacío, se llenará con la raíz en ngOnInit

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
      this.folders = result.folders;
      this.documents = result.documents;

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

  navigateToBreadcrumb(folderId: string | null): void {
    // Normalizar el ID
    const targetId = this.isRootId(folderId) ? null : folderId;
    
    // Evitar carga innecesaria si ya estamos en esa carpeta
    if (targetId !== this.currentFolderId) {
      this.loadContents(targetId);
    }
  }

  // ... (resto de los métodos: openCreateFolderDialog, subida de archivos, etc. se mantienen igual) ...
  // Asegúrate de que la lógica interna de esos métodos no interfiera con currentFolderId o breadcrumbs
  // de formas inesperadas.
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
}