import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './public-header.component.html',
  styleUrls: ['./public-header.component.scss']
})
export class PublicHeaderComponent implements OnInit {
  currentPath: string = '';
  constructor(private router: Router, public authService: AuthService) {}

  // constructor now includes AuthService injection above, so remove this line

  ngOnInit(): void {
    // Inicializar con la ruta actual
    this.currentPath = this.router.url;

    // Suscribirse a cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath = this.router.url;
    });
  }

  isActive(path: string): boolean {
    return this.currentPath === path;
  }

  onLoginClick(): void {
    // Verificar si el usuario ya está autenticado
    if (this.authService.isLoggedIn) {
      // Si ya está autenticado, redirigir directamente a la zona privada
      this.router.navigate(['/home']);
    } else {
      // Si no está autenticado, redirigir a la página de login
      this.router.navigate(['/login']);
    }
  }

  onRegisterClick(): void {
    // Verificar si el usuario ya está autenticado
    if (this.authService.isLoggedIn) {
      // Si ya está autenticado, redirigir directamente a la zona privada
      this.router.navigate(['/home']);
    } else {
      // Si no está autenticado, redirigir a la página de registro
      this.router.navigate(['/register']);
    }
  }
}