import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

// Services
import { DocumentService } from '../../core/services/document.service';
import { FolderService } from '../../core/services/folder.service';
import { AuthService } from '../../core/services/auth.service';

// Models
import { Document } from '../../core/models/document.model';
import { Folder } from '../../core/models/folder.model';

// Dialogs
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

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
    MatChipsModule
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
  private destroy$ = new Subject<void>();
  private router = inject(Router); // Para navegar programáticamente si es necesario

  isLoading = true;
  userName = '';
  recentDocuments: Document[] = [];
  favoriteDocuments: Document[] = [];
  totalDocuments = 0;
  totalFolders = 0;
  storageUsed = 0;
  storageLimit = 0.5 * 1024 * 1024 * 1024; // 5GB ejemplo
  dialog: any;

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
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadRecentDocuments(): void {
    this.isLoading = true;
    this.cdRef.markForCheck();
    
    this.documentService.getRecentDocuments(5).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (docs) => {
        this.recentDocuments = docs;
        this.isLoading = false;
        this.cdRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading recent documents:', error);
        this.isLoading = false;
        this.cdRef.markForCheck();
      }
    });
    
    this.documentService.getFavoriteDocuments(5).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (docs) => {
        this.favoriteDocuments = docs;
        this.cdRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading favorite documents:', error);
        this.cdRef.markForCheck();
      }
    });
  }

  /**
 * Marca o desmarca un documento como favorito
 */
toggleFavorite(doc: Document): void {
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
  
  downloadFile(doc: Document): void {
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
}