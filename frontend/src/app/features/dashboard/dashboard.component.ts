import { Component, OnInit, HostListener } from '@angular/core';
import { RouterLink,Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { PublicHeaderComponent } from '../public-header/public-header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PublicHeaderComponent,
],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  scrolled = false;

  constructor(private titleService: Title, private router: Router, private authService: AuthService) {
    this.titleService.setTitle('FolderFlow - Gestión Documental para PyMES');
  }

  ngOnInit(): void {
    // Aquí podrías cargar datos del servicio si es necesario
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