import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { of, Subject, switchMap, takeUntil } from 'rxjs';

// Material imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Services
import { DocumentService } from '../../core/services/document.service';
import { FolderService } from '../../core/services/folder.service';
import { AuthService } from '../../core/services/auth.service';

// Models
import { Document } from '../../core/models/document.model';
import { Folder } from '../../core/models/folder.model';

// Dialogs
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult } from '../../shared/components/move-item-dialog/move-item-dialog.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatDividerModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private documentService = inject(DocumentService);
  private folderService = inject(FolderService);
  private authService = inject(AuthService);
  private cdRef = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();
  private router = inject(Router); // Para navegar programáticamente si es necesario
  private snackBar = inject(MatSnackBar);


  isLoading = true;
  userName = '';
  recentDocuments: Document[] = [];
  favoriteDocuments: Document[] = [];
  totalDocuments = 0;
  totalFolders = 0;
  storageUsed = 0;
  storageLimit = 0.5 * 1024 * 1024 * 1024; // 500MB disponibles
  folderMap: Map<string, string> = new Map(); // Para mapear IDs de carpetas con nombres

  capitalizeUserName(name: string): string {
  if (!name) return 'Usuario';
  
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
  
  ngOnInit(): void {
    // Obtener el nombre del usuario
    this.authService.currentUser$.pipe(
    takeUntil(this.destroy$)
  ).subscribe(user => {
    console.log('Usuario recibido en Home:', user); // Añadir para depuración
    if (user) {
      // Manejar mejor el caso cuando el nombre no está disponible
      this.userName = user.name || 
                      (user.email ? user.email.split('@')[0] : 'Usuario');
      this.cdRef.markForCheck();
    } else {
      console.log('No hay información de usuario disponible');
      
      // Intenta recuperar desde localStorage directamente como fallback
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const userInfo = JSON.parse(storedUser);
          const rawName = userInfo.name || (userInfo.email ? userInfo.email.split('@')[0] : 'Usuario');
          this.userName = this.capitalizeUserName(rawName);
          this.cdRef.markForCheck();
        }
      } catch (e) {
        console.error('Error recuperando usuario de localStorage:', e);
      }
    }
  });
    
    // Cargar documentos recientes
    this.loadRecentDocuments();
    
    // Cargar estadísticas
    this.loadStatistics();
  }

  /**
   * Abre el documento para visualización
   */
  openDocumentViewer(document: Document): void {
    this.router.navigate(['/documents/view', document._id]);
  }

  /**
   * Elimina un documento tras confirmación del usuario
   */
  deleteDocument(doc: Document, event: Event): void {
    // Evitar que se propague el evento al contenedor
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar documento',
        message: `¿Estás seguro de que deseas eliminar "${doc.name}"?`,
        confirmButtonText: 'Eliminar',
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: any) => {
        if (confirmed) {
          this.documentService.deleteDocument(doc._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                // Eliminar documento de las listas locales
                this.recentDocuments = this.recentDocuments.filter(d => d._id !== doc._id);
                this.favoriteDocuments = this.favoriteDocuments.filter(d => d._id !== doc._id);
                this.cdRef.markForCheck();
                
                // Recargar estadísticas
                this.loadStatistics();
              },
              error: (error) => {
                console.error('Error al eliminar documento:', error);
              }
            });
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Genera un mensaje de bienvenida basado en la hora del día
   */
  getWelcomeMessage(): string {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 5 && hour < 14) {
      return 'Buenos días';
    } else if (hour >= 14 && hour < 21) {
      return 'Buenas tardes';
    } else {
      return 'Buenas noches';
    }
  }
  
  // Modificar loadRecentDocuments para cargar información de carpetas
  loadRecentDocuments(): void {
    this.isLoading = true;
    this.cdRef.markForCheck();
    
    this.documentService.getRecentDocuments(4).pipe(
      takeUntil(this.destroy$),
      switchMap(docs => {
        this.recentDocuments = docs;
        
        // Recopilar todos los IDs de carpetas únicos
        const folderIds = new Set<string>();
        docs.forEach(doc => {
          if (doc.folderId) folderIds.add(doc.folderId);
        });
        
        // Si hay carpetas para buscar, obtener sus detalles
        if (folderIds.size > 0) {
          return this.folderService.getFoldersByIds(Array.from(folderIds));
        }
        
        // Si no hay carpetas, devolver un array vacío
        return of([]);
      })
    ).subscribe({
      next: (folders) => {
        // Crear un mapa de ID a nombre de carpeta
        this.folderMap.clear();
        folders.forEach(folder => {
          this.folderMap.set(folder._id, folder.name);
        });
        
        this.isLoading = false;
        this.cdRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading documents or folders:', error);
        this.isLoading = false;
        this.cdRef.markForCheck();
      }
    });
    
    // Cargar favoritos
    this.documentService.getFavoriteDocuments(4).pipe(
      takeUntil(this.destroy$),
      switchMap(docs => {
        this.favoriteDocuments = docs;
        
        // Recopilar todos los IDs de carpetas únicos
        const folderIds = new Set<string>();
        docs.forEach(doc => {
          if (doc.folderId) folderIds.add(doc.folderId);
        });
        
        // Si hay carpetas para buscar, obtener sus detalles
        if (folderIds.size > 0) {
          return this.folderService.getFoldersByIds(Array.from(folderIds));
        }
        
        // Si no hay carpetas, devolver un array vacío
        return of([]);
      })
    ).subscribe({
      next: (folders) => {
        // Actualizar el mapa de carpetas con los nuevos datos
        folders.forEach(folder => {
          this.folderMap.set(folder._id, folder.name);
        });
        
        this.cdRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading favorite documents:', error);
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
  }

  // Función auxiliar para obtener el nombre de la carpeta
  getFolderName(folderId: string): string {
    return this.folderMap.get(folderId) || 'Carpeta';
  }

  /**
   * Devuelve un color según el tipo de archivo
   */
  getColorForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '#10b981'; // verde para imágenes
    if (mimeType === 'application/pdf') return '#ef4444'; // rojo para PDF
    if (mimeType.startsWith('video/')) return '#3b82f6'; // azul para videos
    if (mimeType.startsWith('audio/')) return '#f59e0b'; // naranja para audio
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '#8b5cf6'; // morado para archivos comprimidos
    if (mimeType.includes('word')) return '#0284c7'; // azul microsoft para Word
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#16a34a'; // verde microsoft para Excel
    if (mimeType.includes('powerpoint')) return '#ea580c'; // naranja microsoft para PowerPoint
    if (mimeType.includes('text/')) return '#6b7280'; // gris para texto plano
    return '#6b4fbb'; // color primario para el resto
  }

  /**
   * Marca o desmarca un documento como favorito
   */
  toggleFavorite(doc: Document, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    const newStatus = !doc.isFavorite;
    
    this.documentService.toggleFavorite(doc._id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          // Actualizar el documento en ambas listas si existe
          this.updateDocumentInLists(updatedDoc);
          
          // Mostrar mensaje de confirmación
          const message = newStatus 
            ? `"${doc.name}" añadido a favoritos` 
            : `"${doc.name}" eliminado de favoritos`;
          
          console.log(message);
          
          // Recargar las listas para mantener todo actualizado
          this.loadRecentDocuments();
          
          this.cdRef.markForCheck();
        },
        error: (error) => {
          console.error('Error al cambiar estado de favorito:', error);
        }
      });
  }

  /**
   * Actualiza el documento en las listas locales
   */
  private updateDocumentInLists(updatedDoc: Document): void {
    // Actualizar en documentos recientes
    const recentIndex = this.recentDocuments.findIndex(d => d._id === updatedDoc._id);
    if (recentIndex !== -1) {
      this.recentDocuments[recentIndex] = updatedDoc;
    }
    
    // Actualizar en favoritos
    const favIndex = this.favoriteDocuments.findIndex(d => d._id === updatedDoc._id);
    if (favIndex !== -1) {
      if (!updatedDoc.isFavorite) {
        // Si se desmarcó como favorito, eliminar de la lista
        this.favoriteDocuments.splice(favIndex, 1);
      } else {
        // Si sigue siendo favorito, actualizar
        this.favoriteDocuments[favIndex] = updatedDoc;
      }
    } else if (updatedDoc.isFavorite) {
      // Si es nuevo favorito, añadir a la lista
      this.favoriteDocuments.push(updatedDoc);
    }
  }
  
  loadStatistics(): void {
    this.documentService.getDocumentStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.totalDocuments = stats.totalCount;
        this.storageUsed = stats.totalSize;
        this.cdRef.markForCheck();
      }
    });
    
    this.folderService.getFolderStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.totalFolders = stats.totalCount;
        this.cdRef.markForCheck();
      }
    });
  }
  
  downloadFile(doc: Document, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    this.documentService.requestDownloadUrl(doc._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        window.open(response.downloadUrl, '_blank');
      });
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // Para valores muy pequeños, mostrar en bytes sin decimales
    if (i === 0) {
      return bytes + ' ' + sizes[i];
    }
    
    // Para el resto de valores, mostrar con 1 decimal
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  getIconForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('video/')) return 'video_library';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.includes('word')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'analytics';
    if (mimeType.includes('text/')) return 'article';
    return 'insert_drive_file';
  }
  
  getTimeAgo(date: string | Date): string {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return past.toLocaleDateString();
  }

  /**
 * Abre el diálogo para mover un documento
 */
openMoveDialog(doc: Document, event: Event): void {
  // Evitar que el click se propague a la tarjeta y abra el visualizador
  event.stopPropagation();
  
  const dialogData: MoveItemDialogData = {
    itemToMove: doc,
    itemType: 'document',
    currentFolderId: doc.folderId // Usar la carpeta actual del documento
  };

  const dialogRef = this.dialog.open<MoveItemDialogComponent, MoveItemDialogData, MoveItemDialogResult>(
    MoveItemDialogComponent,
    {
      width: '500px',
      data: dialogData,
      disableClose: true
    }
  );

  dialogRef.afterClosed()
    .pipe(takeUntil(this.destroy$))
    .subscribe(result => {
      if (result && result.destinationFolderId !== undefined) {
        console.log(`Mover documento ${doc._id} a carpeta destino: ${result.destinationFolderId}`);
        
        this.documentService.moveDocument(doc._id, result.destinationFolderId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Actualizar solo el folderId del documento localmente
              doc.folderId = result.destinationFolderId;
              
              // Recargar las listas para mantener todo actualizado
              this.loadRecentDocuments();
              this.cdRef.markForCheck();
            },
            error: (error) => {
              console.error('Error al mover documento:', error);
            }
          });
      }
    });
}
}