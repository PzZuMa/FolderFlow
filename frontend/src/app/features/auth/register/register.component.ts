import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/errorhandler.service';

/**
 * Componente de registro de usuario.
 * Permite crear una nueva cuenta y redirige al login tras el registro exitoso.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  // Formulario reactivo de registro
  registerForm!: FormGroup;
  // Estado de carga para mostrar spinner o deshabilitar el botón
  isLoading = false;
  // Mensaje de error si ocurre algún fallo
  errorMessage: string | null = null;
  // Mensaje de éxito tras el registro
  successMessage: string | null = null;
  // Indica si el formulario fue enviado
  submitted = false;

  // Inyección de dependencias para formularios, autenticación, navegación y manejo de errores
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);

  ngOnInit(): void {
    // Inicializa el formulario con validaciones
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Getters para facilitar el acceso a los controles del formulario en la plantilla
  get name() { return this.registerForm.get('name'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }

  /**
   * Envía el formulario de registro.
   * Si es exitoso, muestra mensaje y redirige al login tras 2 segundos.
   */
  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    const userData = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.submitted = false;
        this.successMessage = `${response.msg || 'Registro completado con éxito.'} Serás redirigido al login...`;
        this.registerForm.reset();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message;
      }
    });
  }
}