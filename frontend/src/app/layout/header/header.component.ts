import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ErrorHandlerService } from '../../../app/core/services/errorhandler.service';

// Componente de cabecera principal de la aplicación
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    RouterModule,
    CommonModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  // Evento para alternar la barra lateral
  @Output() sidebarToggle = new EventEmitter<void>();
  // Indica si la barra lateral está colapsada (recibe valor desde el padre)
  @Input() isSidebarCollapsed = false;

  // Indica si la vista es móvil
  isMobileView = false;
  // Nombre del usuario autenticado
  userName: string = '';
  // Imagen de perfil del usuario
  userProfileImage: string | null = null;

  // Inyección de servicios
  private authService = inject(AuthService);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private snackBar = inject(MatSnackBar);
  private errorHandler = inject(ErrorHandlerService);

  constructor() {}

  // Inicializa la información del usuario y detecta si es vista móvil
  ngOnInit(): void {
    this.loadUserInfo();
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small
    ]).subscribe(result => {
      this.isMobileView = result.matches;
    });
  }

  // Emite el evento para alternar la barra lateral
  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  // Carga la información del usuario autenticado
  loadUserInfo(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name || '';
        if (user.profileImage && user.profileImage.startsWith('data:')) {
          this.userProfileImage = user.profileImage;
        } else if (user.profileImage && (user.profileImage.startsWith('assets/') || user.profileImage.startsWith('http'))) {
          this.userProfileImage = user.profileImage;
        } else {
          this.userProfileImage = 'assets/images/pfp-default.png';
        }
      }
    });
  }

  // Cierra la sesión y redirige al login
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Navega a la página de cuenta
  navigateToAccount(): void {
    this.router.navigate(['/account']);
  }

  // Navega a la página de configuración (redirige a cuenta)
  navigateToSettings(): void {
    this.navigateToAccount();
  }

  // Navega al dashboard público
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // Determina si una ruta está activa
  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  // Muestra un mensaje de éxito
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }

  // Muestra un mensaje de error
  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
  }
}