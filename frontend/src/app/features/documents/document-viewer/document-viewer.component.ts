/**
 * Componente visor de documentos.
 * Permite visualizar PDFs, imágenes, archivos de texto, audio y vídeo.
 * Incluye navegación de páginas, zoom, rotación, edición de nombre y descarga.
 * Utiliza PDF.js para renderizar archivos PDF.
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, NgZone, AfterViewInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../../../core/services/document.service';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { catchError, switchMap, takeUntil, tap, delay, filter, map, take } from 'rxjs/operators';
import { EMPTY, Subject, timer, Observable } from 'rxjs';
import { Document } from '../../../core/models/document.model';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ErrorHandlerService } from '../../../core/services/errorhandler.service';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

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
  // Referencias a elementos del DOM para el canvas PDF y el contenedor principal
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewerMain', { static: false }) viewerMain?: ElementRef<HTMLElement>;

  // Estado y datos del documento
  documentId: string | null = null;
  document: Document | null = null;
  documentUrl: string | null = null;
  fileType: 'pdf' | 'image' | 'text' | 'html' | 'audio' | 'video' | 'unsupported' = 'unsupported';
  isLoading: boolean = true;
  loadError: boolean = false;
  errorMessage: string = '';
  isFullscreen: boolean = false;
  textContent: string = '';
  private errorHandler = inject(ErrorHandlerService);

  // Estado y control de PDF.js
  pdfLoaded: boolean = false;
  pdfDoc: any = null;
  currentPage: number = 1;
  totalPages: number = 0;
  zoomLevel: number = 100;
  private renderTask: any = null;
  private isRendering: boolean = false;
  private pendingRender: boolean = false;

  // Rotación de imágenes
  imageRotation: number = 0;

  // Edición de nombre de documento
  isEditingName: boolean = false;
  editedName: string = '';
  originalName: string = '';

  // Control de ciclo de vida y renderizado
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
  ) {}

  ngOnInit(): void {
    // Inicializa PDF.js y carga el documento según el parámetro de ruta
    this.initializePdfLibrary().then(() => {
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
    }).catch(error => {
      this.handleError('Error al inicializar el visor de documentos');
    });
  }

  ngAfterViewInit(): void {
    // Observa cambios de tamaño para ajustar el renderizado
    this.setupResizeObserver();
    setTimeout(() => {
      this.viewInitialized$.next();
    }, 0);
  }

  ngOnDestroy(): void {
    // Limpia recursos y observadores
    this.cleanup();
    this.destroy$.next();
    this.destroy$.complete();
    this.viewInitialized$.complete();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private cleanup(): void {
    // Cancela renderizados y libera memoria de PDF.js
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
    // Observa el tamaño del contenedor para ajustar el zoom del PDF
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
    // Evita renderizados excesivos al redimensionar
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

  private async initializePdfLibrary(): Promise<void> {
    // Carga PDF.js dinámicamente si no está disponible
    if (this.pdfLibraryLoaded) return;
    try {
      if (typeof (window as any).pdfjsLib !== 'undefined') {
        this.configurePdfJs();
        this.pdfLibraryLoaded = true;
        return;
      }
      await this.loadPdfScript();
      await new Promise(resolve => setTimeout(resolve, 100));
      this.configurePdfJs();
      this.pdfLibraryLoaded = true;
    } catch (error) {
      throw new Error('No se pudo cargar la librería PDF');
    }
  }

  private loadPdfScript(): Promise<void> {
    // Inserta el script de PDF.js en el DOM si no existe
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="pdfjs-dist"]');
      if (existingScript) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.async = true;
      script.onload = () => {
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF.js script'));
      };
      document.head.appendChild(script);
    });
  }

  private configurePdfJs(): void {
    // Configura la ruta del worker de PDF.js
    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
  }

  loadDocument(documentId: string): void {
    // Carga los metadatos y la URL de descarga del documento
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
        this.handleError('No se pudo cargar el documento');
        return EMPTY;
      })
    ).subscribe(response => {
      this.documentUrl = response.downloadUrl;
      this.handleDocumentByType();
    });
  }

  private resetState(): void {
    // Reinicia el estado del visor antes de cargar un nuevo documento
    this.isLoading = true;
    this.loadError = false;
    this.pdfLoaded = false;
    this.cleanup();
    this.cdRef.markForCheck();
  }

  private handleDocumentByType(): void {
    // Lógica para visualizar el documento según su tipo
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

  private async loadPdfDocument(): Promise<void> {
    // Carga y renderiza un documento PDF usando PDF.js
    if (!this.documentUrl) {
      this.handleError('URL del documento no disponible');
      return;
    }
    try {
      await this.initializePdfLibrary();
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js library not available');
      }
      const loadingTask = pdfjsLib.getDocument({
        url: this.documentUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      this.pdfLoaded = true;
      this.cdRef.detectChanges();
      setTimeout(() => {
        this.waitForViewAndRender();
      }, 50);
    } catch (error) {
      this.handleError('No se pudo cargar el documento PDF');
    }
  }

  private waitForViewAndRender(): void {
    // Espera a que la vista esté lista antes de renderizar el PDF
    if (this.canRenderNow()) {
      this.calculateInitialZoomAndRender();
      return;
    }
    this.viewInitialized$.pipe(
      takeUntil(this.destroy$),
      delay(50),
      switchMap(() => this.retryRender(3, 100))
    ).subscribe({
      next: (success) => {
        if (success) {
        } else {
          this.fallbackRender();
        }
      },
      error: (error) => {
        this.fallbackRender();
      }
    });
  }

  private canRenderNow(): boolean {
    // Determina si se puede renderizar el PDF en este momento
    return !!(this.pdfDoc &&
      this.pdfLibraryLoaded &&
      !this.isRendering &&
      this.pdfLoaded);
  }

  private retryRender(maxAttempts: number, delayMs: number): Observable<boolean> {
    // Reintenta el renderizado varias veces si la vista aún no está lista
    return timer(0, delayMs).pipe(
      map((attempt) => {
        if (this.canRenderNow() && this.pdfCanvas?.nativeElement) {
          this.calculateInitialZoomAndRender();
          return true;
        }
        if (attempt >= maxAttempts - 1) {
          return false;
        }
        return null;
      }),
      filter(result => result !== null),
      take(1)
    );
  }

  private async calculateInitialZoomAndRender(): Promise<void> {
    // Calcula el zoom inicial para ajustar el PDF al contenedor y renderiza la primera página
    if (!this.canRenderNow()) {
      return;
    }
    if (!this.pdfCanvas?.nativeElement) {
      setTimeout(() => {
        if (this.pdfCanvas?.nativeElement) {
          this.calculateInitialZoomAndRender();
        } else {
          this.fallbackRender();
        }
      }, 100);
      return;
    }
    try {
      const page = await this.pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const container = this.viewerMain?.nativeElement;
      const containerWidth = container ? container.clientWidth - 48 : 800;
      let scale = containerWidth / viewport.width;
      scale = Math.max(0.25, Math.min(scale, 2.0));
      this.zoomLevel = Math.round(scale * 100);
      this.isLoading = false;
      this.cdRef.detectChanges();
      await this.renderCurrentPage();
    } catch (error) {
      this.fallbackRender();
    }
  }

  private fallbackRender(): void {
    // Renderizado alternativo si falla el cálculo de zoom inicial
    this.zoomLevel = 100;
    this.isLoading = false;
    this.cdRef.detectChanges();
    if (this.pdfDoc && this.pdfLibraryLoaded && !this.isRendering) {
      setTimeout(() => {
        if (this.pdfCanvas?.nativeElement) {
          this.renderCurrentPage();
        } else {
          this.handleError('No se pudo inicializar el visor de PDF');
        }
      }, 200);
    } else {
      this.handleError('No se pudo cargar el documento PDF');
    }
  }

  private async renderCurrentPage(): Promise<void> {
    // Renderiza la página actual del PDF
    if (this.isRendering || !this.pdfDoc || !this.pdfLoaded) {
      return;
    }
    await this.renderPage(this.currentPage);
  }

  private async renderPage(pageNumber: number): Promise<void> {
    // Renderiza una página específica del PDF en el canvas
    if (this.isRendering) {
      return;
    }
    if (!this.pdfDoc || !this.pdfLibraryLoaded) {
      return;
    }
    if (!this.pdfCanvas?.nativeElement) {
      return;
    }
    this.isRendering = true;
    try {
      if (this.renderTask) {
        this.renderTask.cancel();
        this.renderTask = null;
      }
      const canvas = this.pdfCanvas.nativeElement;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo obtener el contexto 2D del canvas');
      }
      const page = await this.pdfDoc.getPage(pageNumber);
      const scale = this.zoomLevel / 100;
      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      const canvasWidth = Math.floor(viewport.width * outputScale);
      const canvasHeight = Math.floor(viewport.height * outputScale);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewport.width, viewport.height);
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      this.renderTask = page.render(renderContext);
      await this.renderTask.promise;
      this.ngZone.run(() => {
        this.cdRef.markForCheck();
      });
    } catch (error: any) {
      if (error?.name !== 'RenderingCancelledException') {
        this.handleError(`Error al renderizar la página ${pageNumber}`);
      }
    } finally {
      this.isRendering = false;
      this.renderTask = null;
    }
  }

  previousPage(): void {
    // Navega a la página anterior del PDF
    if (this.currentPage > 1 && !this.isRendering) {
      this.currentPage--;
      this.renderCurrentPage();
    }
  }

  nextPage(): void {
    // Navega a la página siguiente del PDF
    if (this.currentPage < this.totalPages && !this.isRendering) {
      this.currentPage++;
      this.renderCurrentPage();
    }
  }

  zoomIn(): void {
    // Aumenta el zoom del PDF
    if (!this.isRendering) {
      this.zoomLevel = Math.min(this.zoomLevel + 25, 300);
      this.updateViewAfterZoom();
    }
  }

  zoomOut(): void {
    // Disminuye el zoom del PDF
    if (!this.isRendering) {
      this.zoomLevel = Math.max(this.zoomLevel - 25, 25);
      this.updateViewAfterZoom();
    }
  }

  private updateViewAfterZoom(): void {
    // Actualiza la vista tras cambiar el zoom
    if (this.fileType === 'pdf' && this.pdfLoaded) {
      timer(50).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.renderCurrentPage();
      });
    }
    this.cdRef.markForCheck();
  }

  rotateImage(): void {
    // Rota la imagen 90 grados
    this.imageRotation = (this.imageRotation + 90) % 360;
    this.cdRef.markForCheck();
  }

  onImageLoad(): void {
    // Resetea el zoom y rotación al cargar una imagen
    this.zoomLevel = 100;
    this.imageRotation = 0;
    this.cdRef.markForCheck();
  }

  toggleFullscreen(): void {
    // Activa o desactiva el modo pantalla completa
    const elem = this.viewerMain?.nativeElement;
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        this.snackBar.open('Error al entrar en pantalla completa', 'Cerrar', { duration: 3000 });
      });
    } else {
      document.exitFullscreen();
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullscreenChange(event: Event): void {
    // Detecta cambios de pantalla completa y ajusta el visor
    this.isFullscreen = !!document.fullscreenElement;
    this.cdRef.markForCheck();
    if (this.fileType === 'pdf' && this.pdfLoaded && !this.isRendering) {
      timer(200).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.calculateInitialZoomAndRender();
      });
    }
  }

  private fetchTextContent(): void {
    // Descarga y muestra el contenido de archivos de texto
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
        this.handleError('No se pudo cargar el contenido del archivo de texto');
      });
  }

  startEditingName(): void {
    // Activa el modo de edición del nombre del documento
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
    // Cancela la edición del nombre
    this.isEditingName = false;
    this.editedName = '';
    this.cdRef.markForCheck();
  }

  saveDocumentName(): void {
    // Guarda el nuevo nombre del documento
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
          this.showError('Error al actualizar el nombre del documento');
          this.cancelEditingName();
        }
      });
  }

  onNameKeyDown(event: KeyboardEvent): void {
    // Maneja teclas Enter y Escape en la edición de nombre
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveDocumentName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditingName();
    }
  }

  downloadFile(): void {
    // Descarga el archivo actual
    if (!this.document || !this.documentUrl) return;
    window.open(this.documentUrl, '_blank');
  }

  goBack(): void {
    // Navega hacia atrás en el historial
    this.location.back();
  }

  private handleError(message: string): void {
    // Muestra un mensaje de error y detiene la carga
    this.loadError = true;
    this.isLoading = false;
    this.errorMessage = message;
    this.cdRef.markForCheck();
  }

  private getNameWithoutExtension(fileName: string): string {
    // Obtiene el nombre del archivo sin la extensión
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }

  private getFileExtension(fileName: string): string {
    // Obtiene la extensión del archivo
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
  }

  private determineFileType(mimeType: string, fileName: string): void {
    // Determina el tipo de archivo para el visor según el MIME y la extensión
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
    // Devuelve una etiqueta legible para el tipo de archivo
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
    // Formatea bytes a una cadena legible (KB, MB, etc.)
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private showSuccess(message: string): void {
    // Muestra un mensaje de éxito en un snackbar
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  private showError(message: string): void {
    // Muestra un mensaje de error en un snackbar
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-error']
    });
  }
}