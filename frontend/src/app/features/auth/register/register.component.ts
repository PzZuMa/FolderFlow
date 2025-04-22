import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Para feedback visual
import { Title } from '@angular/platform-browser'; // Para cambiar el título de la página

import { AuthService } from '../../../core/services/auth.service'; // Ajusta la ruta si es necesario

@Component({
  selector: 'app-register',
  standalone: true, // Componente standalone
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink, // Para el enlace a Login
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  constructor(private titleService: Title) {
    // Cambiar el título de la página al cargar el componente
    this.titleService.setTitle('Registro | FolderFlow');
  }
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Inyección de dependencias moderna
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      // Coincide con los campos del backend (User.model.js)
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      // Coincide con la validación mínima del backend
      password: ['', [Validators.required, Validators.minLength(6)]]
      // Podrías añadir un campo 'confirmPassword' aquí y un validador personalizado
      // para asegurar que las contraseñas coincidan, aunque el backend no lo requiera.
    });
  }

  onSubmit(): void {
    // Marcar todos los campos como 'touched' para mostrar errores si existen
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) {
      console.log('Formulario inválido');
      return; // No enviar si el formulario no es válido
    }

    this.isLoading = true;
    this.errorMessage = null; // Limpiar errores previos
    this.successMessage = null; // Limpiar mensajes de éxito previos

    const userData = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = `${response.msg || 'Registro completado con éxito.'} Serás redirigido al login...`;
        console.log('Registro exitoso:', response);
        this.registerForm.reset(); // Limpiar el formulario

        // Redirigir al login después de un breve momento para que el usuario vea el mensaje
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000); // Espera 2 segundos
      },
      error: (error) => {
        this.isLoading = false;
        // Usamos el mensaje de error que preparamos en el AuthService
        this.errorMessage = error.message || 'Ocurrió un error durante el registro.';
        console.error('Error en el registro:', error);
      }
    });
  }

  // Getters para acceso fácil en la plantilla HTML
  get name() { return this.registerForm.get('name'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
}