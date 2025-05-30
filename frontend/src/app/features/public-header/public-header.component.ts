import { Component, OnInit } from '@angular/core';

import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

/**
 * Componente de cabecera pública.
 * Muestra la navegación principal y botones de login/registro según el estado de autenticación.
 */
@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [
    RouterLink
],
  templateUrl: './public-header.component.html',
  styleUrls: ['./public-header.component.scss']
})
export class PublicHeaderComponent implements OnInit {
  // Ruta actual para resaltar el enlace activo
  currentPath: string = '';

  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    // Actualiza la ruta actual al navegar
    this.currentPath = this.router.url;
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath = this.router.url;
    });
  }

  // Determina si una ruta está activa
  isActive(path: string): boolean {
    return this.currentPath === path;
  }

  // Acceso rápido a login o home según autenticación
  onLoginClick(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  // Acceso rápido a registro o home según autenticación
  onRegisterClick(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/register']);
    }
  }
}