import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service'; // Importa tu servicio de Auth

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() sidebarToggle = new EventEmitter<void>(); // Evento para el botón del sidebar
  private authService = inject(AuthService); // Inyecta AuthService
  private router = inject(Router);

  // Idealmente, obtendrías la info del usuario (imagen, nombre) del AuthService
  // Ejemplo: userName = this.authService.getCurrentUserName();
  // Ejemplo: userProfileImageUrl = this.authService.getCurrentUserProfileImage();
  userProfileImageUrl = 'assets/images/default-profile.png'; // Placeholder

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  logout() {
    this.authService.logout(); // Llama al método logout de tu servicio
    this.router.navigate(['/login']); // Redirige al login
  }

  navigateToSettings() {
    // this.router.navigate(['/app/settings']); // Navega a la página de ajustes si la tienes
    console.log('Navegar a Ajustes');
  }
}