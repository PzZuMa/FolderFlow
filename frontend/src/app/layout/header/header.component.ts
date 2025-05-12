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

  // Cambiado para coincidir con el nombre del archivo en assets/images
  userProfileImageUrl = '/assets/images/pfp-default.png';
  snackBar: any;

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
    this.showError('Funcionalidad no disponible en esta versión');
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }
  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
  }
  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-info'] });
  }
}