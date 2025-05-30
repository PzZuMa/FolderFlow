import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/errorhandler.service';

/**
 * Componente de inicio de sesión.
 * Permite a los usuarios autenticarse y acceder a la aplicación.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  constructor(private titleService: Title) {
    // Establece el título de la página
    this.titleService.setTitle('Iniciar sesión | FolderFlow');
  }

  // Formulario reactivo de login
  loginForm!: FormGroup;
  // Estado de carga para mostrar spinner o deshabilitar el botón
  isLoading = false;
  // Mensaje de error si ocurre algún fallo
  errorMessage: string | null = null;
  // Indica si el formulario fue enviado
  submitted = false;

  // Inyección de dependencias para formularios, autenticación, navegación y manejo de errores
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);

  ngOnInit(): void {
    // Inicializa el formulario con validaciones
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Envía el formulario de login.
   * Si es exitoso, redirige al home.
   */
  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message;
      }
    });
  }

  // Getters para facilitar el acceso a los controles del formulario en la plantilla
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}