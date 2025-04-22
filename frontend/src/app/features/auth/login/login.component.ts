import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; // Importar CommonModule
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; // Opcional para estilo
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Opcional para feedback
import { Title } from '@angular/platform-browser'; // Para cambiar el título de la página

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true, // Componente standalone
  imports: [
    CommonModule, // Necesario para ngIf, ngFor, etc.
    ReactiveFormsModule, // Para formularios reactivos
    RouterLink, // Para enlaces [routerLink]
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  constructor(private titleService: Title) {
    // Cambiar el título de la página al cargar el componente
    this.titleService.setTitle('Iniciar sesión | FolderFlow');
  }
  loginForm!: FormGroup; // Usamos '!' para indicar que se inicializará en ngOnInit
  isLoading = false;
  errorMessage: string | null = null;

  // Inyección de dependencias moderna con inject()
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      // Definir controles del formulario con validadores
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      // Marcar todos los campos como 'touched' para mostrar errores
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login exitoso, respuesta:', response);
        // Redirigir al home o a donde sea necesario
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        console.error('Error en el login:', error);
      }
    });
  }

   // Helper para acceder fácilmente a los controles en la plantilla
   get email() { return this.loginForm.get('email'); }
   get password() { return this.loginForm.get('password'); }
}