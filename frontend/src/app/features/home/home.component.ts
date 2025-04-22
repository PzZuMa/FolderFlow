import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service'; // Importa AuthService
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
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
    throw new Error('Method not implemented.');
  }

  // Podrías obtener datos del usuario aquí si los necesitas mostrar
  // userName: string | null = null;
  // ngOnInit() {
  //   // Si guardaste datos del usuario en AuthService o localStorage al hacer login...
  // }
}