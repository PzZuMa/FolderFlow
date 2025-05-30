import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';

/**
 * Componente de pie de página.
 * Muestra enlaces legales y el año actual.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterLink
],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  // Año actual para mostrar en el footer
  currentYear = new Date().getFullYear();
}