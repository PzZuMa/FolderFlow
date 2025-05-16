import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
  ],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  submitted = false;
  passwordSubmitted = false;
  isLoading = false;
  isPasswordLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  passwordSuccessMessage: string | null = null;
  passwordErrorMessage: string | null = null;
  
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor(private titleService: Title) {
    this.titleService.setTitle('Mi Cuenta | FolderFlow');
  }

  ngOnInit(): void {
    // Inicializar formularios
    this.initProfileForm();
    this.initPasswordForm();
    
    // Cargar datos del usuario actual
    this.loadUserData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initProfileForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private initPasswordForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private loadUserData(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.profileForm.patchValue({
            name: user.name || '',
            email: user.email || ''
          });
        } else {
          // Si no hay usuario autenticado, redirigir al login
          this.router.navigate(['/login']);
        }
      });
  }

  onSubmitProfile(): void {
    this.submitted = true;
    this.successMessage = null;
    this.errorMessage = null;

    if (this.profileForm.invalid) {
      return;
    }

    this.isLoading = true;
    const userData = this.profileForm.value;

    this.authService.updateProfile(userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.submitted = false;
          this.successMessage = 'Perfil actualizado correctamente';
          setTimeout(() => this.successMessage = null, 5000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Error al actualizar el perfil';
        }
      });
  }

  onSubmitPassword(): void {
    this.passwordSubmitted = true;
    this.passwordSuccessMessage = null;
    this.passwordErrorMessage = null;

    if (this.passwordForm.invalid) {
      return;
    }

    this.isPasswordLoading = true;
    const passwordData = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.authService.changePassword(passwordData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isPasswordLoading = false;
          this.passwordSubmitted = false;
          this.passwordSuccessMessage = 'Contraseña actualizada correctamente';
          this.passwordForm.reset();
          setTimeout(() => this.passwordSuccessMessage = null, 5000);
        },
        error: (error) => {
          this.isPasswordLoading = false;
          this.passwordErrorMessage = error.message || 'Error al cambiar la contraseña';
        }
      });
  }

  // Añade estas variables
showCurrentPassword: boolean = false;
showNewPassword: boolean = false;
showConfirmPassword: boolean = false;

// Añade estos métodos para alternar la visibilidad de las contraseñas
toggleCurrentPasswordVisibility(): void {
  this.showCurrentPassword = !this.showCurrentPassword;
}

toggleNewPasswordVisibility(): void {
  this.showNewPassword = !this.showNewPassword;
}

toggleConfirmPasswordVisibility(): void {
  this.showConfirmPassword = !this.showConfirmPassword;
}

  // Getters para acceso fácil desde la plantilla
  get name() { return this.profileForm.get('name'); }
  get email() { return this.profileForm.get('email'); }
  get currentPassword() { return this.passwordForm.get('currentPassword'); }
  get newPassword() { return this.passwordForm.get('newPassword'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }
}