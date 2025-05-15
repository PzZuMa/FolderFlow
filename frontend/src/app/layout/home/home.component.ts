import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(private titleService: Title) {
    // Cambiar el título de la página al cargar el componente
    this.titleService.setTitle('Home | FolderFlow');
  }
  
  // Inyectamos AuthService y Router
  private authService = inject(AuthService);
  private router = inject(Router);

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout();
    // AuthService ya redirige a /login, pero podrías añadir lógica extra aquí si fuese necesario.
    console.log('Usuario desconectado.');
  }

  ngOnInit(): void {
    // Aquí podríamos verificar la autenticación o cargar datos del usuario
    // Por ejemplo: verificar si hay un token válido, obtener datos del perfil, etc.
  }
}