import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../footer/footer.component';
import { PublicHeaderComponent } from '../public-header/public-header.component';

/**
 * Componente para mostrar la política de privacidad.
 * Incluye año actual y componentes de cabecera y pie de página.
 */
@Component({
  selector: 'app-politica-privacidad',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
  ],
  templateUrl: './politica-privacidad.component.html',
  styleUrls: ['./politica-privacidad.component.scss']
})
export class PoliticaPrivacidadComponent implements OnInit {
  // Año actual para mostrar en el pie de página
  currentYear: number = new Date().getFullYear();

  constructor(private titleService: Title) {
    // Establece el título de la página
    this.titleService.setTitle('Política de Privacidad | FolderFlow');
  }

  ngOnInit(): void {
    // No se requiere lógica adicional al inicializar
  }
}