// src/app/features/folder-explorer/folder-explorer.component.ts
import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip'; // Añadir Tooltip
import { Observable, forkJoin, of, Subject, EMPTY } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';

// Importaciones Core y Shared
import { Folder, Document, UploadStatus } from '../../../core/models'; // Ajusta ruta si es necesario
import { FolderService } from '../../../core/services/folder.service';
import { DocumentService } from '../../../core/services/document.service';
import { CreateFolderDialogComponent } from '../../../shared/components/create-folder-dialog/create-folder-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult } from '../../../shared/components/move-item-dialog/move-item-dialog.component'; // Importar diálogo de mover
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-folder-explorer',
  standalone: true,
  imports: [ // Módulos necesarios para la plantilla
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
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './folder-explorer.component.html',
  styleUrls: ['./folder-explorer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderExplorerComponent implements OnInit, OnDestroy {
  // --- Inyecciones (igual que DocumentExplorer original) ---
  private folderService = inject(FolderService);
  private documentService = inject(DocumentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // --- Estado (igual que DocumentExplorer original) ---
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  currentFolderId: string | null = null;
  folders: Folder[] = [];
  documents: Document[] = [];
  breadcrumbs: Folder[] = []; // Mantenemos breadcrumbs para navegación de carpetas
  isLoading: boolean = false;
  uploads: UploadStatus[] = [];

  ngOnInit(): void {
    // Cargar raíz o basado en ruta (igual que antes)
    // Por ahora, carga la raíz
    this.loadContents(null);
    // Opcional: Escuchar route params si tienes rutas como /app/folders/:id
    // this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => { ... });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadContents(folderId: string | null): void {
    this.isLoading = true;
    this.currentFolderId = folderId;
    this.uploads = [];
    this.cdRef.markForCheck();

    // ForkJoin para cargar todo (igual que antes)
    forkJoin({
      folders: this.folderService.getFolders(folderId),
      documents: this.documentService.getDocuments(folderId),
      breadcrumbs: this.folderService.getBreadcrumbs(folderId) // Mantenemos breadcrumbs aquí
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading contents:', error);
        this.showError('Error al cargar el contenido.');
        return of({ folders: [], documents: [], breadcrumbs: [] });
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(result => {
      this.folders = result.folders;
      this.documents = result.documents;
      this.breadcrumbs = result.breadcrumbs.length > 0
                         ? result.breadcrumbs
                         : [{ _id: '', name: 'Raíz', parentId: null, ownerId: '' }]; // Raíz virtual
      this.cdRef.markForCheck();
    });
  }

  // --- Navegación (igual que antes) ---
  navigateToFolder(folderId: string): void {
     this.loadContents(folderId);
  }
  navigateToBreadcrumb(folderId: string | null): void {
    const targetId = folderId === '' ? null : folderId;
    // Solo recargar si no es el último breadcrumb
    if (targetId !== this.currentFolderId) {
        this.loadContents(targetId);
    }
  }

  // --- Creación de Carpeta (igual que antes) ---
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

  // --- Subida de Archivos (igual que antes, se mantiene botón en toolbar) ---
  triggerFileInputClick(): void { this.fileInput.nativeElement.click(); }
  onFileSelected(event: Event): void { /* ... lógica existente ... */ }
  private startUploadProcess(upload: UploadStatus): void { /* ... lógica existente ... */ }
  private confirmUploadBackend(upload: UploadStatus): void { /* ... lógica existente ... */ }

  // --- Descarga de Archivos (igual que antes) ---
  downloadFile(document: Document): void { /* ... lógica existente ... */ }

  // --- Eliminación (igual que antes) ---
  openDeleteConfirmation(item: Folder | Document, itemType: 'folder' | 'document'): void { /* ... lógica existente ... */ }
  private deleteItem(item: Folder | Document, itemType: 'folder' | 'document'): void { /* ... lógica existente ... */ }

  // --- Mover Item (Igual que se añadió en DocumentExplorer) ---
  openMoveDialog(item: Folder | Document, itemType: 'folder' | 'document'): void {
      console.log(`Abriendo diálogo para mover ${itemType}: ${item.name}`);
      const dialogData: MoveItemDialogData = {
        itemToMove: item,
        itemType: 'folder',
        currentFolderId: null
      };
      const dialogRef = this.dialog.open<MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult>(
          MoveItemDialogComponent, { data: dialogData, width: '500px', disableClose: true }
      );
      dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
          if (result && result.destinationFolderId !== undefined) {
              this.moveItem(item, itemType, result.destinationFolderId);
          } else { console.log('Diálogo de mover cerrado sin confirmar.'); }
      });
  }
  private moveItem(item: Folder | Document, itemType: 'folder' | 'document', destinationFolderId: string | null): void {
      console.log(`Ejecutando movimiento de ${itemType} ${item._id} a carpeta ${destinationFolderId}`);
      this.showInfo(`Mover ${item.name} aún no implementado.`);
      // Lógica futura con llamada al servicio
  }


  // --- Utilidades (igual que antes) ---
  getIconForMimeType(mimeType: string): string {
    // Example logic to return an icon based on MIME type
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('application/pdf')) {
      return 'picture_as_pdf';
    } else {
      return 'insert_drive_file';
    }
  }
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  private showSuccess(message: string): void { /* ... lógica existente ... */ }
  private showError(message: string): void { /* ... lógica existente ... */ }
  private showInfo(message: string): void { this.snackBar.open(message, 'Cerrar', { duration: 3000 }); }
}