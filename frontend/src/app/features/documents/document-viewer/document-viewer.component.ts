import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../../../core/services/document.service';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { catchError, finalize, switchMap, takeUntil, tap, delay, filter } from 'rxjs/operators';
import { EMPTY, Subject, of, timer, fromEvent } from 'rxjs';
import { Document } from '../../../core/models/document.model';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

declare var pdfjsLib: any;

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    SafeUrlPipe,
    MatDividerModule,
    FormsModule,
  ],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewerMain', { static: false }) viewerMain?: ElementRef<HTMLElement>;

  // Estado del documento
  documentId: string | null = null;
  document: Document | null = null;
  documentUrl: string | null = null;
  fileType: 'pdf' | 'image' | 'text' | 'html' | 'audio' | 'video' | 'unsupported' = 'unsupported';
  isLoading: boolean = true;
  loadError: boolean = false;
  errorMessage: string = '';
  isFullscreen: boolean = false;
  textContent: string = '';

  // Estado del PDF
  pdfLoaded: boolean = false;
  pdfDoc: any = null;
  currentPage: number = 1;
  totalPages: number = 0;
  zoomLevel: number = 100;
  private renderTask: any = null;
  private isRendering: boolean = false;
  private pendingRender: boolean = false;

  // Estado de imagen
  imageRotation: number = 0;

  // Estado de edición
  isEditingName: boolean = false;
  editedName: string = '';
  originalName: string = '';

  // Control de componente
  private destroy$ = new Subject<void>();
  private pdfLibraryLoaded: boolean = false;
  private viewInitialized$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private documentService: DocumentService,
    private cdRef: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  ngOnInit(): void {
    this.initializePdfLibrary();
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.documentId = id;
        this.loadDocument(id);
      } else {
        this.handleError('ID de documento no válido');
      }
    });
  }

  ngAfterViewInit(): void {
    // Configurar observador de redimensionamiento
    this.setupResizeObserver();
    
    // Señalar que la vista está inicializada
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.viewInitialized$.next();
      }, 0);
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.destroy$.next();
    this.destroy$.complete();
    this.viewInitialized$.complete();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private cleanup(): void {
    if (this.renderTask) {
      this.renderTask.cancel();
      this.renderTask = null;
    }
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.isRendering = false;
    this.pendingRender = false;
  }

  private setupResizeObserver(): void {
    if (!this.viewerMain?.nativeElement) return;

    this.resizeObserver = new ResizeObserver(entries => {
      if (this.fileType === 'pdf' && this.pdfLoaded && !this.isRendering) {
        this.ngZone.run(() => {
          this.debounceRender();
        });
      }
    });

    this.resizeObserver.observe(this.viewerMain.nativeElement);
  }

  private debounceRender(): void {
    if (this.pendingRender) return;
    
    this.pendingRender = true;
    timer(150).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pendingRender = false;
      if (this.fileType === 'pdf' && this.pdfLoaded) {
        this.renderCurrentPage();
      }
    });
  }

  // ===== INICIALIZACIÓN PDF.JS =====
  private async initializePdfLibrary(): Promise<void> {
    if (this.pdfLibraryLoaded) return;

    try {
      // Verificar si PDF.js ya está cargado
      if (typeof pdfjsLib !== 'undefined') {
        this.configurePdfJs();
        this.pdfLibraryLoaded = true;
        return;
      }

      // Cargar PDF.js dinámicamente
      await this.loadPdfScript();
      this.configurePdfJs();
      this.pdfLibraryLoaded = true;
      console.log('✅ PDF.js loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load PDF.js:', error);
      throw new Error('No se pudo cargar la librería PDF');
    }
  }

  private loadPdfScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PDF.js script'));
      document.head.appendChild(script);
    });
  }

  private configurePdfJs(): void {
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
  }

  // ===== CARGA DE DOCUMENTO =====
  loadDocument(documentId: string): void {
    this.resetState();
    
    this.documentService.getDocumentById(documentId).pipe(
      takeUntil(this.destroy$),
      tap(doc => {
        this.document = doc;
        this.determineFileType(doc.mimeType, doc.name);
        this.cdRef.markForCheck();
      }),
      switchMap(doc => this.documentService.requestDownloadUrl(documentId)),
      catchError(error => {
        console.error('Error loading document:', error);
        this.handleError('No se pudo cargar el documento');
        return EMPTY;
      })
    ).subscribe(response => {
      this.documentUrl = response.downloadUrl;
      this.handleDocumentByType();
    });
  }

  private resetState(): void {
    this.isLoading = true;
    this.loadError = false;
    this.pdfLoaded = false;
    this.cleanup();
    this.cdRef.markForCheck();
  }

  private handleDocumentByType(): void {
    switch (this.fileType) {
      case 'pdf':
        this.loadPdfDocument();
        break;
      case 'text':
        this.fetchTextContent();
        break;
      default:
        this.isLoading = false;
        this.cdRef.markForCheck();
    }
  }

  // ===== MANEJO DE PDF =====
  private async loadPdfDocument(): Promise<void> {
    if (!this.documentUrl) {
      this.handleError('URL del documento no disponible');
      return;
    }

    try {
      await this.initializePdfLibrary();

      const loadingTask = pdfjsLib.getDocument({
        url: this.documentUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      this.pdfLoaded = true;
      
      console.log(`✅ PDF loaded: ${this.totalPages} pages`);
      this.cdRef.markForCheck();

      // Esperar a que tanto la vista como el PDF estén listos
      this.waitForViewAndRender();

    } catch (error) {
      console.error('❌ Error loading PDF:', error);
      this.handleError('No se pudo cargar el documento PDF');
    }
  }

  private waitForViewAndRender(): void {
    // Esperar a que la vista esté inicializada
    this.viewInitialized$.pipe(
      takeUntil(this.destroy$),
      // Asegurar que el canvas existe
      filter(() => !!this.pdfCanvas?.nativeElement),
      // Pequeño delay para asegurar que el DOM esté completamente listo
      switchMap(() => timer(50))
    ).subscribe(() => {
      this.ngZone.run(() => {
        this.calculateInitialZoomAndRender();
      });
    });

    // Respaldo: intentar después de un tiempo si la vista no se inicializa
    timer(500).pipe(
      takeUntil(this.destroy$),
      filter(() => this.pdfLoaded && !this.isLoading)
    ).subscribe(() => {
      if (this.pdfCanvas?.nativeElement) {
        this.ngZone.run(() => {
          this.calculateInitialZoomAndRender();
        });
      }
    });
  }

  private async calculateInitialZoomAndRender(): Promise<void> {
    if (!this.pdfDoc || !this.pdfCanvas?.nativeElement || !this.viewerMain?.nativeElement) {
      console.warn('⚠️ Resources not ready for initial render');
      // Intentar de nuevo después de un breve delay
      timer(100).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if (this.pdfDoc && this.pdfCanvas?.nativeElement && this.viewerMain?.nativeElement) {
          this.calculateInitialZoomAndRender();
        } else {
          // Usar valores por defecto si no podemos calcular
          this.fallbackRender();
        }
      });
      return;
    }

    try {
      const page = await this.pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = this.viewerMain.nativeElement.clientWidth - 48; // padding

      // Calcular escala para ajustarse al contenedor
      let scale = containerWidth / viewport.width;
      scale = Math.max(0.25, Math.min(scale, 2.0)); // Limitar entre 25% y 200%
      this.zoomLevel = Math.round(scale * 100);

      console.log(`📏 Initial zoom calculated: ${this.zoomLevel}%`);
      
      this.isLoading = false;
      this.cdRef.markForCheck();
      
      // Renderizar inmediatamente
      await this.renderCurrentPage();
      
    } catch (error) {
      console.error('❌ Error calculating initial zoom:', error);
      this.fallbackRender();
    }
  }

  private fallbackRender(): void {
    console.log('🔄 Using fallback render');
    this.zoomLevel = 100;
    this.isLoading = false;
    this.cdRef.markForCheck();
    
    // Intentar renderizar con zoom por defecto
    timer(0).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.renderCurrentPage();
    });
  }

  private async renderCurrentPage(): Promise<void> {
    if (this.isRendering || !this.pdfDoc || !this.pdfLoaded) {
      console.warn('⚠️ Render skipped: already rendering or PDF not ready');
      return;
    }

    await this.renderPage(this.currentPage);
  }

  private async renderPage(pageNumber: number): Promise<void> {
    if (this.isRendering) {
      console.warn(`⚠️ Already rendering, skipping page ${pageNumber}`);
      return;
    }

    if (!this.pdfDoc || !this.pdfCanvas?.nativeElement) {
      console.warn(`⚠️ Cannot render page ${pageNumber}: resources not available`);
      return;
    }

    this.isRendering = true;

    try {
      // Cancelar render anterior si existe
      if (this.renderTask) {
        this.renderTask.cancel();
        this.renderTask = null;
      }

      const canvas = this.pdfCanvas.nativeElement;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('No se pudo obtener el contexto del canvas');
      }

      const page = await this.pdfDoc.getPage(pageNumber);
      const desiredScale = this.zoomLevel / 100;
      const viewport = page.getViewport({ scale: desiredScale });
      const outputScale = window.devicePixelRatio || 1;

      // Configurar dimensiones del canvas
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Limpiar canvas antes de renderizar
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      // Fondo blanco para PDFs con transparencia
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewport.width, viewport.height);

      // Renderizar página
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      this.renderTask = page.render(renderContext);
      await this.renderTask.promise;
      
      console.log(`✅ Page ${pageNumber} rendered successfully at ${this.zoomLevel}%`);
      
      // Forzar actualización visual
      this.ngZone.run(() => {
        this.cdRef.markForCheck();
      });

    } catch (error: any) {
      if (error?.name !== 'RenderingCancelledException') {
        console.error(`❌ Error rendering page ${pageNumber}:`, error);
        this.handleError('Error al renderizar la página del PDF');
      }
    } finally {
      this.isRendering = false;
      this.renderTask = null;
    }
  }

  // ===== CONTROLES PDF =====
  previousPage(): void {
    if (this.currentPage > 1 && !this.isRendering) {
      this.currentPage--;
      this.renderCurrentPage();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages && !this.isRendering) {
      this.currentPage++;
      this.renderCurrentPage();
    }
  }

  zoomIn(): void {
    if (!this.isRendering) {
      this.zoomLevel = Math.min(this.zoomLevel + 25, 300);
      this.updateViewAfterZoom();
    }
  }

  zoomOut(): void {
    if (!this.isRendering) {
      this.zoomLevel = Math.max(this.zoomLevel - 25, 25);
      this.updateViewAfterZoom();
    }
  }

  private updateViewAfterZoom(): void {
    if (this.fileType === 'pdf' && this.pdfLoaded) {
      // Pequeño delay para evitar renders múltiples
      timer(50).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.renderCurrentPage();
      });
    }
    this.cdRef.markForCheck();
  }

  // ===== OTROS CONTROLES =====
  rotateImage(): void {
    this.imageRotation = (this.imageRotation + 90) % 360;
    this.cdRef.markForCheck();
  }

  onImageLoad(): void {
    this.zoomLevel = 100;
    this.imageRotation = 0;
    this.cdRef.markForCheck();
  }

  toggleFullscreen(): void {
    const elem = this.viewerMain?.nativeElement;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
        this.snackBar.open('Error al entrar en pantalla completa', 'Cerrar', { duration: 3000 });
      });
    } else {
      document.exitFullscreen();
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullscreenChange(event: Event): void {
    this.isFullscreen = !!document.fullscreenElement;
    this.cdRef.markForCheck();
    
    if (this.fileType === 'pdf' && this.pdfLoaded && !this.isRendering) {
      // Recalcular zoom después del cambio de pantalla completa
      timer(200).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.calculateInitialZoomAndRender();
      });
    }
  }

  // ===== TEXTO =====
  private fetchTextContent(): void {
    if (!this.documentUrl) return;

    fetch(this.documentUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        this.textContent = text;
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
      .catch(error => {
        console.error('Error fetching text content:', error);
        this.handleError('No se pudo cargar el contenido del archivo de texto');
      });
  }

  // ===== EDICIÓN DE NOMBRE =====
  startEditingName(): void {
    if (this.document) {
      this.originalName = this.document.name;
      this.editedName = this.getNameWithoutExtension(this.document.name);
      this.isEditingName = true;
      this.cdRef.markForCheck();
      
      setTimeout(() => {
        const input = document.querySelector('.name-editor input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
  }

  cancelEditingName(): void {
    this.isEditingName = false;
    this.editedName = '';
    this.cdRef.markForCheck();
  }

  saveDocumentName(): void {
    if (!this.document || !this.editedName.trim() || !this.documentId) {
      this.cancelEditingName();
      return;
    }

    const extension = this.getFileExtension(this.document.name);
    const newName = this.editedName.trim() + (extension ? `.${extension}` : '');
    
    if (newName === this.document.name) {
      this.cancelEditingName();
      return;
    }

    this.documentService.updateDocumentName(this.documentId, newName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          this.document = updatedDoc;
          this.isEditingName = false;
          this.cdRef.markForCheck();
          this.showSuccess('Nombre del documento actualizado');
        },
        error: (error) => {
          console.error('Error updating document name:', error);
          this.showError('Error al actualizar el nombre del documento');
          this.cancelEditingName();
        }
      });
  }

  onNameKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveDocumentName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditingName();
    }
  }

  // ===== UTILIDADES =====
  downloadFile(): void {
    if (!this.document || !this.documentUrl) return;
    window.open(this.documentUrl, '_blank');
  }

  goBack(): void {
    this.location.back();
  }

  private handleError(message: string): void {
    this.isLoading = false;
    this.loadError = true;
    this.errorMessage = message;
    this.cdRef.markForCheck();
  }

  private getNameWithoutExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
  }

  private determineFileType(mimeType: string, fileName: string): void {
    const extension = this.getFileExtension(fileName).toLowerCase();
    
    if (mimeType === 'application/pdf') {
      this.fileType = 'pdf';
    } else if (mimeType.startsWith('image/')) {
      this.fileType = 'image';
    } else if (mimeType === 'text/html' || extension === 'html' || extension === 'htm') {
      this.fileType = 'unsupported';
    } else if (mimeType.startsWith('text/') || ['js', 'ts', 'json', 'xml', 'css', 'scss', 'md', 'log', 'yml'].includes(extension)) {
      this.fileType = 'text';
    } else if (mimeType.startsWith('audio/')) {
      this.fileType = 'audio';
    } else if (mimeType.startsWith('video/')) {
      this.fileType = 'video';
    } else {
      this.fileType = 'unsupported';
    }
  }

  getFileTypeLabel(mimeType: string): string {
    if (!this.document) return 'Archivo';
    
    const extension = this.getFileExtension(this.document.name).toLowerCase();
    const typeMap: { [key: string]: string } = {
      'ts': 'TypeScript',
      'js': 'JavaScript',
      'html': 'HTML',
      'htm': 'HTML',
      'css': 'CSS',
      'scss': 'SASS',
      'sass': 'SASS',
      'json': 'JSON',
      'xml': 'XML',
      'md': 'Markdown',
      'yml': 'YAML',
      'yaml': 'YAML'
    };

    if (typeMap[extension]) return typeMap[extension];
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase();
    if (mimeType === 'text/plain') return 'Texto';
    if (mimeType === 'text/csv') return 'CSV';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.startsWith('video/')) return 'Vídeo';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Hoja de cálculo';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Documento';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentación';
    
    return 'Archivo';
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
    this.snackBar.open(message, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['snackbar-success'] 
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['snackbar-error'] 
    });
  }
}