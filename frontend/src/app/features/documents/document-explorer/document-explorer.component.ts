import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu'; // Para menú contextual opcional
import { Observable, forkJoin, of, Subject, EMPTY } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';


import { Folder, Document, UploadStatus } from '../../../core/models'; // Importa todas
import { FolderService } from '../../../core/services/folder.service';
import { DocumentService } from '../../../core/services/document.service';
import { CreateFolderDialogComponent } from '../../../shared/components/create-folder-dialog/create-folder-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';

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
    MatMenuModule
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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>; // Para el input file oculto

  currentFolderId: string | null = null; // null para la raíz
  folders: Folder[] = [];
  documents: Document[] = [];
  breadcrumbs: Folder[] = [];
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];

  ngOnInit(): void {
    // Escuchar cambios en los parámetros de ruta si usas rutas tipo /app/folders/:folderId
    // this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
    //   this.currentFolderId = params.get('folderId'); // Obtiene el ID de la URL
    //   this.loadContents(this.currentFolderId);
    // });

    // O si no usas parámetros de ruta, carga la raíz inicialmente
    this.loadContents(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadContents(folderId: string | null): void {
    this.isLoading = true;
    this.currentFolderId = folderId;
    this.uploads = []; // Limpiar subidas pendientes al navegar
    this.cdRef.markForCheck(); // Marcar para detección de cambios

    forkJoin({
      folders: this.folderService.getFolders(folderId),
      documents: this.documentService.getDocuments(folderId),
      breadcrumbs: this.folderService.getBreadcrumbs(folderId)
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading contents:', error);
        this.showError('Error al cargar el contenido de la carpeta.');
        return of({ folders: [], documents: [], breadcrumbs: [] }); // Valor por defecto en error
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck(); // Marcar para detección de cambios
      })
    ).subscribe(result => {
      this.folders = result.folders;
      this.documents = result.documents;
      // Asegurarse que breadcrumbs tenga el item 'Raíz' si no viene del servicio
      this.breadcrumbs = result.breadcrumbs.length > 0
                         ? result.breadcrumbs
                         : [{ _id: '', name: 'Raíz', parentId: null, ownerId: '' }];

      this.cdRef.markForCheck(); // Marcar para detección de cambios
    });
  }

  navigateToFolder(folderId: string): void {
     // Si usas rutas: this.router.navigate(['/app/folders', folderId]);
     // Si no usas rutas:
     this.loadContents(folderId);
  }

  navigateToBreadcrumb(folderId: string | null): void {
    // El id de 'Raíz' es '' en mi implementación, el servicio lo maneja como null
    const targetId = folderId === '' ? null : folderId;
    this.loadContents(targetId);
  }

  // --- Creación de Carpeta ---
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
              return EMPTY; // No continuar si hay error
            }),
            finalize(() => {
              this.isLoading = false;
              this.cdRef.markForCheck();
            })
          )
          .subscribe(() => {
            this.showSuccess('Carpeta creada exitosamente.');
            this.loadContents(this.currentFolderId); // Recargar
          });
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
      this.cdRef.markForCheck(); // Actualizar vista para mostrar progreso inicial

      this.startUploadProcess(uploadStatus);
    });
  }

  private startUploadProcess(upload: UploadStatus): void {
      upload.status = 'pending'; // Estado inicial mientras se obtiene URL
      this.cdRef.markForCheck();

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
            switchMap(response => {
                upload.status = 'uploading';
                upload.s3Key = response.s3Key; // Guardar s3Key para la confirmación
                this.cdRef.markForCheck();
                // Devolver el observable de la subida a S3
                return this.documentService.uploadFileToS3(response.signedUrl, upload.file);
            }),
            catchError(err => { // Error durante la subida a S3
                console.error('Error uploading to S3:', err);
                upload.status = 'error';
                upload.error = 'Error durante la subida del archivo.';
                 // Podrías intentar limpiar el objeto en S3 aquí si tienes la key, pero es complejo
                this.cdRef.markForCheck();
                return EMPTY;
            })
        )
        .subscribe({
            next: (event) => {
                if (typeof event === 'number') {
                    upload.progress = event; // Actualizar progreso
                } else if (event instanceof HttpResponse) {
                    // Subida a S3 completada (HttpResponse de S3)
                    upload.status = 'confirming'; // Cambiar estado a confirmando
                    upload.progress = 100; // Asegurar 100%
                    this.cdRef.markForCheck();
                    // Llamar a confirmar la subida en nuestro backend
                    this.confirmUploadBackend(upload);
                }
                this.cdRef.markForCheck(); // Actualizar progreso en la UI
            },
            error: (err) => { // Manejado en los catchError anteriores, pero por si acaso
                console.error('Unexpected error in upload subscribe:', err);
                if (upload.status !== 'error') { // Evitar doble seteo
                  upload.status = 'error';
                  upload.error = 'Error inesperado durante la subida.';
                  this.cdRef.markForCheck();
                }
            }
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
          this.loadContents(this.currentFolderId); // Recargar contenido para ver el nuevo archivo
      });
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
      this.loadContents(this.currentFolderId); // Recargar
    });
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

}
