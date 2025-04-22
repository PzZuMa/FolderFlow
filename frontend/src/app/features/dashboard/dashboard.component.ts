import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // Para usar routerLink
import { MatButtonModule } from '@angular/material/button'; // Para los botones
import { MatCardModule } from '@angular/material/card'; // Para estilo (opcional)
import { CommonModule } from '@angular/common'; // Para ngIf, etc.
import { Title } from '@angular/platform-browser'; // Para cambiar el título de la página

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  constructor(private titleService: Title) {
    // Cambiar el título de la página al cargar el componente
    this.titleService.setTitle('FolderFlow');
  }
  // No necesita lógica especial por ahora, solo muestra la plantilla.
  // Podrías añadir aquí datos del producto si vienen de un servicio.
  productName = "Gestor Documental PyMES"; // Ejemplo
  productDescription = "La solución perfecta para organizar los documentos de tu pequeña o mediana empresa de forma segura y eficiente."; // Ejemplo
}