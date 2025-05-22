import { Component, OnInit, inject, Inject, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EMPTY, Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil, finalize } from 'rxjs/operators';

import { Folder, Document } from '../../../core/models';
import { FolderService } from '../../../core/services/folder.service';
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
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="icon-container">
          <mat-icon>drive_file_move</mat-icon>
        </div>
        <h2 mat-dialog-title>Mover "{{ data.itemToMove.name }}" a:</h2>
      </div>
      
      <!-- Navegación de breadcrumbs simplificada -->
      <div class="breadcrumb-section">
        <div class="breadcrumb-container">
          <ng-container *ngFor="let crumb of dialogBreadcrumbs; let isLast = last">
            <button mat-button class="breadcrumb-button"
                  (click)="selectBreadcrumbInDialog(crumb._id)"
                  [disabled]="isLast"
                  type="button">
              <mat-icon *ngIf="crumb.name === 'Raíz'">home</mat-icon>
              <span class="crumb-name">{{ crumb.name }}</span>
            </button>
            <mat-icon class="breadcrumb-separator" *ngIf="!isLast">chevron_right</mat-icon>
          </ng-container>
        </div>
        
        <button mat-icon-button class="create-folder-button" (click)="openCreateFolderInDialog()" 
                matTooltip="Crear nueva carpeta aquí" type="button">
          <mat-icon>create_new_folder</mat-icon>
        </button>
      </div>
      
      <mat-dialog-content class="dialog-content">
        <!-- Indicador de Carga -->
        <div *ngIf="isLoading" class="loading-indicator">
          <mat-progress-spinner diameter="40" mode="indeterminate"></mat-progress-spinner>
        </div>
        
        <!-- Mensaje de Error -->
        <div *ngIf="errorMessage && !isLoading" class="error-message">
          <mat-icon color="warn">error</mat-icon>
          <span>{{ errorMessage }}</span>
        </div>
        
        <!-- Lista de Carpetas -->
        <div *ngIf="!isLoading && !errorMessage" class="folders-container">
          <div *ngFor="let folder of foldersInDialog"
               class="folder-item"
               (click)="selectFolderInDialog(folder._id)"
               matTooltip="Abrir carpeta {{folder.name}}">
            <mat-icon class="folder-icon">folder</mat-icon>
            <span class="folder-name">{{ folder.name }}</span>
          </div>
          
          <!-- Mensaje si no hay subcarpetas -->
          <p *ngIf="foldersInDialog.length === 0" class="empty-folder-message">
            No hay subcarpetas aquí.
          </p>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button class="cancel-button" (click)="onCancel()">
          Cancelar
        </button>
        <button mat-flat-button color="primary"
                class="move-button"
                (click)="onMoveHere()"
                [disabled]="!isMoveAllowed()">
          <mat-icon>move_up</mat-icon>
          <span>Mover Aquí</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      animation: dialogFadeIn 0.3s ease-out;
      padding: 0;
      border-radius: 12px;
      overflow: hidden;
      width: 100%;
    }
    
    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      gap: 16px;
    }
    
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: rgba(107, 79, 187, 0.1);
      flex-shrink: 0;
    }
    
    .icon-container mat-icon {
      color: #6b4fbb;
      font-size: 24px;
      height: 24px;
      width: 24px;
    }
    
    mat-dialog-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      letter-spacing: -0.01em;
    }
    
    .breadcrumb-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background-color: #f8f9fa;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    
    .breadcrumb-container {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 4px;
    }
    
    .breadcrumb-button {
      min-width: auto;
      padding: 4px 8px;
      font-size: 0.9em;
      color: rgba(0,0,0,0.6);
      height: auto;
      line-height: 1.2;
    
      &:hover:not(:disabled) {
        background-color: rgba(0,0,0,0.05);
      }
      
      &:disabled .crumb-name {
        font-weight: 500;
        color: #2c3e50;
      }
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
        vertical-align: middle;
      }
      
      .crumb-name {
        vertical-align: middle;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: inline-block;
      }
    }
    
    .breadcrumb-separator {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(0,0,0,0.4);
      vertical-align: middle;
    }
    
    .create-folder-button {
      color: #6b4fbb;
      flex-shrink: 0;
      
      &:hover {
        background-color: rgba(107, 79, 187, 0.1);
      }
    }
    
    .dialog-content {
      padding: 16px 24px !important;
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 150px;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      padding: 16px;
      color: #dc3545;
      background-color: rgba(220, 53, 69, 0.1);
      border-radius: 8px;
      
      mat-icon {
        margin-right: 8px;
      }
    }
    
    .folders-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .folder-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border: 1px solid transparent;
      
      &:hover {
        background-color: rgba(107, 79, 187, 0.05);
        border-color: rgba(107, 79, 187, 0.2);
      }
      
      .folder-icon {
        color: #ffca28;
        margin-right: 12px;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      .folder-name {
        font-size: 0.95em;
        font-weight: 500;
        color: #2c3e50;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .empty-folder-message {
      text-align: center;
      color: rgba(0,0,0,0.6);
      padding: 32px 16px;
      font-style: italic;
      margin: 0;
    }
    
    mat-dialog-actions {
      padding: 16px 24px !important;
      margin: 0;
      gap: 12px;
      border-top: 1px solid rgba(0,0,0,0.06);
    }
    
    .move-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      height: 40px;
      font-weight: 500;
      border-radius: 8px;
      background-color: #6b4fbb;
      
      &:hover:not([disabled]) {
        background-color: #5a3fa3;
        box-shadow: 0 4px 8px rgba(107, 79, 187, 0.3);
      }
      
      &:disabled {
        opacity: 0.6;
      }
    }
    
    .cancel-button {
      font-weight: 500;
      border-radius: 8px;
      height: 40px;
      color: #666;
      
      &:hover {
        background-color: rgba(0,0,0,0.05);
      }
    }
    
    @keyframes dialogFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoveItemDialogComponent implements OnInit, OnDestroy {
  // Inyecciones
  private dialogRef = inject(MatDialogRef<MoveItemDialogComponent, MoveItemDialogResult>);
  public data: MoveItemDialogData = inject(MAT_DIALOG_DATA);
  private folderService = inject(FolderService);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Estado interno
  isLoading = false;
  dialogCurrentFolderId: string | null = null;
  foldersInDialog: Folder[] = [];
  dialogBreadcrumbs: Folder[] = [];
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadDialogContents(null); // Empezar en la raíz
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

    forkJoin({
      folders: this.folderService.getFolders(folderId),
      breadcrumbs: this.folderService.getBreadcrumbs(folderId)
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading dialog contents:', error);
        this.errorMessage = 'Error al cargar carpetas.';
        return of({ folders: [], breadcrumbs: [] });
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
    if (!this.isMoveAllowed()) return;

    const result: MoveItemDialogResult = {
      destinationFolderId: this.dialogCurrentFolderId
    };
    this.dialogRef.close(result);
  }

  openCreateFolderInDialog(): void {
    const createDialogRef = this.dialog.open(CreateFolderDialogComponent, {
      width: '400px',
    });

    createDialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((folderName: string) => {
      if (folderName) {
        this.isLoading = true;
        this.cdRef.markForCheck();
        
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
    this.dialogRef.close();
  }

  /**
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
    // 3. (Opcional) No mover una carpeta a una de sus subcarpetas.
    return true;
  }
}