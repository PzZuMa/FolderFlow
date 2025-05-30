import { Component, OnInit } from '@angular/core';

import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../../features/footer/footer.component';
import { PublicHeaderComponent } from '../../features/public-header/public-header.component';

/**
 * Componente para mostrar el aviso legal de la aplicación.
 * Incluye el año actual y componentes de cabecera y pie de página públicos.
 */
@Component({
  selector: 'app-aviso-legal',
  standalone: true,
  imports: [
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
],
  templateUrl: './aviso-legal.component.html',
  styleUrls: ['./aviso-legal.component.scss']
})
export class AvisoLegalComponent implements OnInit {
  // Año actual para mostrar en el aviso legal
  currentYear: number = new Date().getFullYear();

  constructor(private titleService: Title) {
    // Establece el título de la página
    this.titleService.setTitle('Aviso Legal | FolderFlow');
  }

  ngOnInit(): void {
    // No se requiere lógica adicional al inicializar
  }
}