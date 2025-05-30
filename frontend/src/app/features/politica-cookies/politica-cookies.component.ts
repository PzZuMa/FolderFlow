import { Component, OnInit } from '@angular/core';

import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../footer/footer.component';
import { PublicHeaderComponent } from '../public-header/public-header.component';

/**
 * Componente para mostrar la política de cookies.
 * Incluye año actual y componentes de cabecera y pie de página.
 */
@Component({
  selector: 'app-politica-cookies',
  standalone: true,
  imports: [
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
],
  templateUrl: './politica-cookies.component.html',
  styleUrls: ['./politica-cookies.component.scss']
})
export class PoliticaCookiesComponent implements OnInit {
  // Año actual para mostrar en el pie de página
  currentYear: number = new Date().getFullYear();

  constructor(private titleService: Title) {
    // Establece el título de la página
    this.titleService.setTitle('Política de Cookies | FolderFlow');
  }

  ngOnInit(): void {
    // No se requiere lógica adicional al inicializar
  }
}