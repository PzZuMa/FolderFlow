// filepath: c:\Users\Pablo Zumaquero\FolderFlow\frontend\src\app\layout\header\header.component.ts
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
  @Output() sidebarToggle = new EventEmitter<void>();
  @Input() isSidebarCollapsed = false;
  
  isMobileView = false;
  userName: string = '';
  userProfileImage: string | null = null;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private snackBar = inject(MatSnackBar);

  constructor() {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small
    ]).subscribe(result => {
      this.isMobileView = result.matches;
    });
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  loadUserInfo(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name || '';
        
        // Si la imagen de perfil comienza con 'data:', es un string base64
        if (user.profileImage && user.profileImage.startsWith('data:')) {
          this.userProfileImage = user.profileImage;
        } 
        // Si comienza con 'assets/' o 'http', es una URL de imagen
        else if (user.profileImage && (user.profileImage.startsWith('assets/') || user.profileImage.startsWith('http'))) {
          this.userProfileImage = user.profileImage;
        }
        // Si es la imagen por defecto o no hay imagen
        else {
          // Usar la ruta correcta para la imagen por defecto
          this.userProfileImage = 'assets/images/pfp-default.png';
        }
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Método renombrado para mayor claridad
  navigateToAccount(): void {
    // Navegar al componente de cuenta
    this.router.navigate(['/account']);
  }

  // Antiguo método de navegación a ajustes, ahora redirige a account
  navigateToSettings(): void {
    this.navigateToAccount();
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
  
  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
  }
  
  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
  }
}