import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Pipe personalizado para marcar URLs como seguras para recursos (iframe, video, etc.)
@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  // Inyecta el servicio DomSanitizer para sanear URLs
  constructor(private sanitizer: DomSanitizer) {}

  // Transforma la URL recibida en un SafeResourceUrl usando el sanitizer
  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}