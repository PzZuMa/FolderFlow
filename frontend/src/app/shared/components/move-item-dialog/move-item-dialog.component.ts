// src/app/shared/components/dialogs/move-item-dialog/move-item-dialog.component.ts
import { Component, OnInit, inject, Inject, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar'; // Para la mini-toolbar del diálogo
import { EMPTY, Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil, finalize } from 'rxjs/operators';

import { Folder, Document } from '../../../core/models'; // Ajusta ruta a tus modelos
import { FolderService } from '../../../core/services/folder.service'; // Ajusta ruta
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateFolderDialogComponent } from '../create-folder-dialog/create-folder-dialog.component';

// Interfaz para los datos que recibe el diálogo
export interface MoveItemDialogData {
  itemToMove: Folder | Document;
  itemType: 'folder' | 'document';
  currentFolderId: string | null; // ID de la carpeta donde está actualmente el item
}

// Interfaz para lo que devuelve el diálogo al cerrar con éxito
export interface MoveItemDialogResult {
  destinationFolderId: string | null; // null significa mover a la raíz
}

@Component({
  selector: 'app-move-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatTooltipModule
  ],
  templateUrl: './move-item-dialog.component.html',
  styleUrls: ['./move-item-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoveItemDialogComponent implements OnInit, OnDestroy {
  // --- Inyecciones ---
  private dialogRef = inject(MatDialogRef<MoveItemDialogComponent, MoveItemDialogResult>); // Especifica tipo de resultado
  public data: MoveItemDialogData = inject(MAT_DIALOG_DATA); // Hacer público para usar en template
  private folderService = inject(FolderService);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private dialog: MatDialog = inject(MatDialog);

  // --- Estado Interno del Diálogo ---
  isLoading = false;
  dialogCurrentFolderId: string | null = null; // Carpeta que se está viendo DENTRO del diálogo
  foldersInDialog: Folder[] = [];
  dialogBreadcrumbs: Folder[] = []; // Breadcrumbs DENTRO del diálogo
  errorMessage: string | null = null;
  // Removed duplicate declaration of 'dialog'
  snackBar: any;

  ngOnInit(): void {
    this.loadDialogContents(null); // Empezar en la raíz del diálogo
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga las carpetas y breadcrumbs para la vista actual DENTRO del diálogo.
   */
  loadDialogContents(folderId: string | null): void {
    this.isLoading = true;
    this.dialogCurrentFolderId = folderId;
    this.errorMessage = null;
    this.cdRef.markForCheck();

    // Usamos forkJoin para obtener carpetas y breadcrumbs para la navegación del diálogo
    forkJoin({
      folders: this.folderService.getFolders(folderId), // Solo necesitamos carpetas aquí
      breadcrumbs: this.folderService.getBreadcrumbs(folderId) // Para la navegación interna
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading dialog contents:', error);
        this.errorMessage = 'Error al cargar carpetas.';
        return of({ folders: [], breadcrumbs: [] }); // Devolver vacío en error
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(result => {
      // Filtrar la carpeta que estamos moviendo (si es una carpeta)
      this.foldersInDialog = result.folders.filter(f =>
          !(this.data.itemType === 'folder' && f._id === this.data.itemToMove._id)
      );
      // Asegurar que los breadcrumbs del diálogo siempre empiecen por "Raíz"
      this.dialogBreadcrumbs = result.breadcrumbs.length > 0
                         ? result.breadcrumbs
                         : [{ _id: '', name: 'Raíz', parentId: null, ownerId: '' }]; // Raíz virtual
      this.cdRef.markForCheck();
    });
  }

  /**
   * Navega a una subcarpeta dentro del diálogo.
   */
  selectFolderInDialog(folderId: string): void {
    this.loadDialogContents(folderId);
  }

  /**
   * Navega usando los breadcrumbs dentro del diálogo.
   */
  selectBreadcrumbInDialog(folderId: string | null): void {
    const targetId = folderId === '' ? null : folderId;
    // Solo recargar si el breadcrumb no es el último (la carpeta actual)
    if (targetId !== this.dialogCurrentFolderId) {
        this.loadDialogContents(targetId);
    }
  }

  /**
   * Confirma la acción de mover a la carpeta actualmente visible en el diálogo.
   */
  onMoveHere(): void {
    if (!this.isMoveAllowed()) return; // Doble chequeo por si el botón no se deshabilitó

    const result: MoveItemDialogResult = {
      destinationFolderId: this.dialogCurrentFolderId // El destino es donde estamos ahora en el diálogo
    };
    this.dialogRef.close(result); // Cerrar y devolver el ID de destino
  }

  openCreateFolderInDialog(): void {
    const createDialogRef = this.dialog.open(CreateFolderDialogComponent, {
      width: '400px',
      // No pasar datos aquí, el diálogo de crear es simple
    });

    createDialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((folderName: string) => {
      if (folderName) {
        this.isLoading = true; // Podrías tener un spinner más pequeño y localizado
        this.cdRef.markForCheck();
        // Crear la carpeta DENTRO de la carpeta actualmente visible en el diálogo de mover
        this.folderService.createFolder(folderName, this.dialogCurrentFolderId)
          .pipe(
            takeUntil(this.destroy$),
            catchError(err => {
              console.error('Error creating folder in dialog:', err);
              this.snackBar.open(`Error al crear la carpeta: ${err.error?.message || err.message}`, 'Cerrar', { duration: 3000 });
              return EMPTY;
            }),
            finalize(() => {
              this.isLoading = false;
              this.cdRef.markForCheck();
            })
          )
          .subscribe((newFolder) => {
            // this.snackBar.open(`Carpeta "${newFolder.name}" creada.`, 'Cerrar', { duration: 2000 });
            // Recargar el contenido del diálogo para mostrar la nueva carpeta
            this.foldersInDialog = [...this.foldersInDialog, newFolder];
            this.cdRef.markForCheck();
          });
      }
    });
  }

  

  /**
   * Cancela la operación.
   */
  onCancel(): void {
    this.dialogRef.close(); // Cerrar sin devolver datos
  }

  /**
   * Verifica si el movimiento a la carpeta actual del diálogo es válido.
   * Se usa para habilitar/deshabilitar el botón "Mover Aquí".
   */
  isMoveAllowed(): boolean {
    // 1. No se puede mover a la carpeta donde ya está
    if (this.dialogCurrentFolderId === this.data.currentFolderId) {
        return false;
    }
    // 2. Si movemos una CARPETA, no se puede mover a sí misma
    if (this.data.itemType === 'folder' && this.dialogCurrentFolderId === this.data.itemToMove._id) {
        return false;
    }
    // 3. (Opcional - Complejo) No mover una carpeta a una de sus subcarpetas.
    //    Requeriría verificar si data.itemToMove._id está en los ancestros
    //    de dialogCurrentFolderId (obtenidos de dialogBreadcrumbs). Por ahora lo omitimos.

    return true; // Permitido por defecto si no caemos en las condiciones anteriores
  }
}