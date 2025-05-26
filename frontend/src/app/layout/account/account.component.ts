import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { ErrorHandlerService } from '../../core/services/errorhandler.service';

// Componente de gestión de cuenta de usuario
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
  // Formularios reactivos para perfil y contraseña
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Estados de envío y carga
  submitted = false;
  passwordSubmitted = false;
  isLoading = false;
  isPasswordLoading = false;

  // Mensajes de éxito y error
  successMessage: string | null = null;
  errorMessage: string | null = null;
  passwordSuccessMessage: string | null = null;
  passwordErrorMessage: string | null = null;

  // Imagen de perfil y estados asociados
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  currentProfileImage: string | null = null;
  isImageLoading = false;
  imageSuccessMessage: string | null = null;
  imageErrorMessage: string | null = null;
  isDefaultImage: boolean = false;

  // Control de ciclo de vida
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);

  // Constructor que establece el título de la página
  constructor(private titleService: Title) {
    this.titleService.setTitle('Mi Cuenta | FolderFlow');
  }

  // Inicializa formularios y carga datos del usuario
  ngOnInit(): void {
    this.initProfileForm();
    this.initPasswordForm();
    this.loadUserData();
  }

  // Limpia recursos al destruir el componente
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Inicializa el formulario de perfil
  private initProfileForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // Inicializa el formulario de cambio de contraseña
  private initPasswordForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Valida que las contraseñas coincidan
  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  // Carga los datos del usuario autenticado
  private loadUserData(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.profileForm.patchValue({
            name: user.name || '',
            email: user.email || ''
          });
          if (user.profileImage && user.profileImage !== 'default-profile.png') {
            if (user.profileImage.startsWith('data:')) {
              this.currentProfileImage = user.profileImage;
              this.isDefaultImage = false;
            } else if (user.profileImage.includes('pfp-default.png')) {
              this.currentProfileImage = 'assets/images/pfp-default.png';
              this.isDefaultImage = true;
            } else {
              this.currentProfileImage = `assets/profile-images/${user.profileImage}`;
              this.isDefaultImage = false;
            }
          } else {
            this.currentProfileImage = 'assets/images/pfp-default.png';
            this.isDefaultImage = true;
          }
        } else {
          this.router.navigate(['/login']);
        }
      });
  }

  // Maneja la selección de un archivo de imagen para el perfil
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.imageErrorMessage = null;
      this.selectedFile = input.files[0];
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(this.selectedFile.type)) {
        this.imageErrorMessage = 'Solo se permiten imágenes PNG, JPG o JPEG';
        this.selectedFile = null;
        this.previewUrl = null;
        return;
      }
      if (this.selectedFile.size > 5000000) {
        this.imageErrorMessage = 'La imagen debe ser menor a 5MB';
        this.selectedFile = null;
        this.previewUrl = null;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
      this.resizeAndPreview(this.selectedFile);
    }
  }

  // Redimensiona la imagen seleccionada para optimizarla
  private resizeAndPreview(file: File): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxSize = 800;
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          if (optimizedFile.size > 2000000) {
            this.imageErrorMessage = 'La imagen es demasiado grande incluso después de optimizarla';
            return;
          }
          this.selectedFile = optimizedFile;
        }
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  }

  // Crea una vista previa de la imagen seleccionada
  private createImagePreview(): void {
    if (!this.selectedFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(this.selectedFile);
  }

  // Sube la imagen de perfil al servidor
  uploadProfileImage(): void {
    if (!this.selectedFile) return;
    this.isImageLoading = true;
    this.imageSuccessMessage = null;
    this.imageErrorMessage = null;
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const profileImageData = { profileImage: base64String };
      this.authService.updateProfileImage(profileImageData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isImageLoading = false;
            this.imageSuccessMessage = 'Imagen de perfil actualizada correctamente';
            this.currentProfileImage = base64String;
            this.isDefaultImage = false;
            this.selectedFile = null;
            setTimeout(() => this.imageSuccessMessage = null, 5000);
          },
          error: (error) => {
            this.isImageLoading = false;
            this.imageErrorMessage = error.message || 'Error al actualizar la imagen de perfil';
          }
        });
    };
    reader.readAsDataURL(this.selectedFile);
  }

  // Restablece la imagen de perfil al valor por defecto
  removeProfileImage(): void {
    this.isImageLoading = true;
    this.imageSuccessMessage = null;
    this.imageErrorMessage = null;
    const defaultImagePath = 'default-profile.png';
    const profileImageData = { profileImage: defaultImagePath };
    this.authService.updateProfileImage(profileImageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isImageLoading = false;
          this.imageSuccessMessage = 'Imagen de perfil restablecida';
          this.currentProfileImage = 'assets/images/pfp-default.png';
          this.isDefaultImage = true;
          this.selectedFile = null;
          this.previewUrl = null;
          setTimeout(() => this.imageSuccessMessage = null, 5000);
        },
        error: (error) => {
          this.isImageLoading = false;
          this.imageErrorMessage = error.message || 'Error al restablecer la imagen de perfil';
        }
      });
  }

  // Envía el formulario de perfil para actualizar datos
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

  // Envía el formulario de cambio de contraseña
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

  // Estados para mostrar/ocultar contraseñas en los inputs
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // Alterna la visibilidad del campo de contraseña actual
  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  // Alterna la visibilidad del campo de nueva contraseña
  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  // Alterna la visibilidad del campo de confirmación de contraseña
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Getters para los controles de los formularios
  get name() { return this.profileForm.get('name'); }
  get email() { return this.profileForm.get('email'); }
  get currentPassword() { return this.passwordForm.get('currentPassword'); }
  get newPassword() { return this.passwordForm.get('newPassword'); }
  get confirmPassword() { return this.passwordForm.get('confirmPassword'); }
}