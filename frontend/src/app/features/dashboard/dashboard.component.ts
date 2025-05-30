/**
 * Componente del dashboard público.
 * Muestra la página de bienvenida y permite navegar al registro o al home si el usuario ya está autenticado.
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Title } from '@angular/platform-browser';
import { PublicHeaderComponent } from '../public-header/public-header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    PublicHeaderComponent
],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Indica si la página está scrolleada (para efectos visuales)
  scrolled = false;

  constructor(
    private titleService: Title,
    private router: Router,
    private authService: AuthService
  ) {
    // Establece el título de la página
    this.titleService.setTitle('FolderFlow - Gestión Documental para PyMES');
  }

  ngOnInit(): void {
    // No se requiere lógica adicional al inicializar
  }

  onRegisterClick(): void {
    // Redirige al registro o al home según el estado de autenticación
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/register']);
    }
  }
}