import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../../../core/services/document.service';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { catchError, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { EMPTY, Subject, of } from 'rxjs';
import { Document } from '../../../core/models/document.model';

// Declare PDF.js to use it for PDF rendering
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
    SafeUrlPipe
  ],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewerComponent implements OnInit, OnDestroy {
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas?: ElementRef<HTMLCanvasElement>;
  
  documentId: string | null = null;
  document: Document | null = null;
  documentUrl: string | null = null;
  fileType: 'pdf' | 'image' | 'text' | 'html' | 'audio' | 'video' | 'unsupported' = 'unsupported';
  isLoading: boolean = true;
  loadError: boolean = false;
  errorMessage: string = '';
  isFullscreen: boolean = false;
  sharingEnabled: boolean = false;
  pdfLoaded: boolean = false;
  textContent: string = '';
  
  // PDF Specific properties
  pdfDoc: any = null;
  currentPage: number = 1;
  totalPages: number = 0;
  
  // Image Specific properties
  imageRotation: number = 0;
  
  // Common properties
  zoomLevel: number = 100;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private documentService: DocumentService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load PDF.js script if not loaded
    this.loadPdfLibrary();
    
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocument(documentId: string): void {
    this.isLoading = true;
    this.loadError = false;
    this.cdRef.markForCheck();
    
    // First get document metadata
    this.documentService.getDocumentById(documentId).pipe(
      takeUntil(this.destroy$),
      switchMap(doc => {
        this.document = doc;
        this.determineFileType(doc.mimeType);
        this.cdRef.markForCheck();
        
        // Then get download URL
        return this.documentService.requestDownloadUrl(documentId);
      }),
      catchError(error => {
        console.error('Error loading document:', error);
        this.handleError('No se pudo cargar el documento');
        return EMPTY;
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdRef.markForCheck();
      })
    ).subscribe(response => {
      this.documentUrl = response.downloadUrl;
      
      // Based on file type, process accordingly
      if (this.fileType === 'pdf') {
        this.loadPdfDocument(this.documentUrl);
      } else if (this.fileType === 'text') {
        this.fetchTextContent(this.documentUrl);
      } else {
        // Images, audio, video and HTML can be displayed directly from URL
        this.cdRef.markForCheck();
      }
    });
  }

  private determineFileType(mimeType: string): void {
    if (mimeType === 'application/pdf') {
      this.fileType = 'pdf';
    } else if (mimeType.startsWith('image/')) {
      this.fileType = 'image';
    } else if (
      mimeType === 'text/plain' || 
      mimeType === 'application/json' ||
      mimeType === 'text/csv' ||
      mimeType.includes('javascript') ||
      mimeType.includes('typescript')
    ) {
      this.fileType = 'text';
    } else if (mimeType === 'text/html') {
      this.fileType = 'html';
    } else if (mimeType.startsWith('audio/')) {
      this.fileType = 'audio';
    } else if (mimeType.startsWith('video/')) {
      this.fileType = 'video';
    } else {
      this.fileType = 'unsupported';
    }
  }

  private loadPdfLibrary(): void {
    if (typeof pdfjsLib === 'undefined') {
      // Load PDF.js if not available
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.onload = () => {
        // Set worker source
        if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }
      };
      document.body.appendChild(script);
    }
  }

  private loadPdfDocument(url: string): void {
    if (typeof pdfjsLib === 'undefined') {
      setTimeout(() => this.loadPdfDocument(url), 500);
      return;
    }

    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then((pdf: any) => {
      this.pdfDoc = pdf;
      this.totalPages = pdf.numPages;
      this.pdfLoaded = true;
      this.cdRef.markForCheck();
      
      // Render the first page
      this.renderPage(this.currentPage);
    }).catch((error: any) => {
      console.error('Error loading PDF:', error);
      this.handleError('No se pudo cargar el PDF');
    });
  }

  private renderPage(pageNumber: number): void {
    if (!this.pdfDoc || !this.pdfCanvas) return;

    this.pdfDoc.getPage(pageNumber).then((page: any) => {
      const canvas = this.pdfCanvas?.nativeElement;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // PDF original dimensions
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Scale to fit in viewer while maintaining aspect ratio
      const containerWidth = this.pdfCanvas?.nativeElement.parentElement?.clientWidth || viewport.width;
      const scale = containerWidth / viewport.width * (this.zoomLevel / 100);
      
      const scaledViewport = page.getViewport({ scale });
      
      // Set canvas dimensions
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      
      // Render PDF page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };
      
      page.render(renderContext);
    });
  }

  private fetchTextContent(url: string): void {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(text => {
        this.textContent = text;
        this.cdRef.markForCheck();
      })
      .catch(error => {
        console.error('Error fetching text content:', error);
        this.handleError('No se pudo cargar el contenido del archivo');
      });
  }

  private handleError(message: string): void {
    this.isLoading = false;
    this.loadError = true;
    this.errorMessage = message;
    this.cdRef.markForCheck();
  }

  // Navigation methods
  goBack(): void {
    this.location.back();
  }

  // PDF controls
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderPage(this.currentPage);
      this.cdRef.markForCheck();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.renderPage(this.currentPage);
      this.cdRef.markForCheck();
    }
  }

  // Zoom controls
  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 25, 200);
    if (this.fileType === 'pdf') {
      this.renderPage(this.currentPage);
    }
    this.cdRef.markForCheck();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 25, 50);
    if (this.fileType === 'pdf') {
      this.renderPage(this.currentPage);
    }
    this.cdRef.markForCheck();
  }

  // Image controls
  rotateImage(): void {
    this.imageRotation = (this.imageRotation + 90) % 360;
    this.cdRef.markForCheck();
  }

  onImageLoad(): void {
    // Reset zoom and rotation when a new image is loaded
    this.zoomLevel = 100;
    this.imageRotation = 0;
  }

  // General controls
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    this.cdRef.markForCheck();
  }

  downloadFile(): void {
    if (!this.document || !this.documentUrl) return;
    
    // Method 1: Open in new tab (browser handles download)
    window.open(this.documentUrl, '_blank');
    
    // Alternative Method: Force download
    // const link = document.createElement('a');
    // link.href = this.documentUrl;
    // link.download = this.document.name;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
  }

  openInNewTab(): void {
    if (this.documentUrl) {
      window.open(this.documentUrl, '_blank');
    }
  }

  shareDocument(): void {
    // Implement document sharing functionality
    // This could open a dialog with sharing options
    console.log('Share document functionality to be implemented');
  }

  printDocument(): void {
    if (this.fileType === 'pdf' || this.fileType === 'image' || this.fileType === 'html') {
      if (this.documentUrl) {
        const printWindow = window.open(this.documentUrl, '_blank');
        printWindow?.addEventListener('load', () => {
          printWindow?.print();
        });
      }
    }
  }

  isPrintable(): boolean {
    return ['pdf', 'image', 'html'].includes(this.fileType);
  }

  // Utility methods
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  getFileTypeLabel(mimeType: string): string {
    // Convert MIME type to user-friendly label
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase();
    if (mimeType === 'text/plain') return 'Texto';
    if (mimeType === 'text/html') return 'HTML';
    if (mimeType === 'application/json') return 'JSON';
    if (mimeType === 'text/csv') return 'CSV';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.startsWith('video/')) return 'Vídeo';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Hoja de cálculo';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Documento';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentación';
    
    return 'Archivo';
  }
}