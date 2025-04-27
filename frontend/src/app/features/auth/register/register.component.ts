import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // <--- Asegúrate que ReactiveFormsModule está importado aquí
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf, etc.
import { AuthService } from '../../../core/services/auth.service'; // Ajusta la ruta si es necesario

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,         // Para directivas como *ngIf
    ReactiveFormsModule,  // <--- ¡Asegúrate de añadir esto aquí!
    RouterLink            // Para el enlace <a routerLink="...">
    // Ya no necesitas los módulos de Angular Material aquí
  ],
  templateUrl: './register.component.html', // Tu HTML
  styleUrls: ['./register.component.scss'] // Tu SCSS
})
export class RegisterComponent implements OnInit {
  // ... el resto de tu código TypeScript ...

  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  submitted = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Getters
  get name() { return this.registerForm.get('name'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      console.log('Formulario inválido, mostrando errores.');
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
        this.errorMessage = error.message || 'Ocurrió un error durante el registro.';
        console.error('Error en el registro:', error);
      }
    });
  }
}