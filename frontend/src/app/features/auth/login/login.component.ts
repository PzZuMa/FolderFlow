import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  constructor(private titleService: Title) {
    // Cambiar el título de la página al cargar el componente
    this.titleService.setTitle('Iniciar sesión | FolderFlow');
  }
  
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  submitted = false;

  // Inyección de dependencias moderna con inject()
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.loginForm.invalid) {
      console.log('Formulario inválido, mostrando errores.');
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
        this.router.navigate(['/app']);
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