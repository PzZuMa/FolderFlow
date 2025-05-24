import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { ErrorHandlerService } from '../../core/services/errorhandler.service';


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
  
  // Variables para la imagen de perfil
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  currentProfileImage: string | null = null;
  isImageLoading = false;
  imageSuccessMessage: string | null = null;
  imageErrorMessage: string | null = null;
  // Variable para verificar si es la imagen por defecto
  isDefaultImage: boolean = false;
  
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);

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
          
          // Verificar si tiene imagen personalizada o es la por defecto
          if (user.profileImage && user.profileImage !== 'default-profile.png') {
            // Si la imagen comienza con 'data:', es un string base64
            if (user.profileImage.startsWith('data:')) {
              this.currentProfileImage = user.profileImage;
              this.isDefaultImage = false;
            } 
            // Si no, asumimos que es una ruta a un archivo
            else if (user.profileImage.includes('pfp-default.png')) {
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
          // Si no hay usuario autenticado, redirigir al login
          this.router.navigate(['/login']);
        }
      });
  }

  // Método para manejar la selección de archivos
  onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.imageErrorMessage = null;
    this.selectedFile = input.files[0];
    
    // Validar tamaño y tipo de archivo
    if (this.selectedFile.size > 5000000) { // 5MB máximo
      this.imageErrorMessage = 'La imagen debe ser menor a 5MB';
      this.selectedFile = null;
      return;
    }
    
    if (!this.selectedFile.type.match(/image\/(jpeg|jpg|png|gif)/)) {
      this.imageErrorMessage = 'El formato debe ser JPG, PNG o GIF';
      this.selectedFile = null;
      return;
    }
    
    // Redimensionar la imagen si es muy grande
    this.resizeAndPreview(this.selectedFile);
  }
}

private resizeAndPreview(file: File): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    // Configurar tamaño máximo (ej: 800x800px)
    const maxSize = 800;
    let { width, height } = img;
    
    // Calcular nuevas dimensiones manteniendo aspect ratio
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
    
    // Configurar canvas
    canvas.width = width;
    canvas.height = height;
    
    // Dibujar imagen redimensionada
    ctx?.drawImage(img, 0, 0, width, height);
    
    // Convertir a blob con calidad optimizada
    canvas.toBlob((blob) => {
      if (blob) {
        // Crear nuevo File con la imagen optimizada
        const optimizedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        // Verificar que el archivo optimizado no supere los límites
        if (optimizedFile.size > 2000000) { // 2MB después de optimización
          this.imageErrorMessage = 'La imagen es demasiado grande incluso después de optimizarla';
          return;
        }
        
        this.selectedFile = optimizedFile;
        this.createImagePreview();
      }
    }, 'image/jpeg', 0.8); // 80% de calidad
  };
  
  img.src = URL.createObjectURL(file);
}
  
  // Crear vista previa de la imagen
  private createImagePreview(): void {
    if (!this.selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(this.selectedFile);
  }
  
  // Subir la imagen de perfil
  uploadProfileImage(): void {
    if (!this.selectedFile) return;
    
    this.isImageLoading = true;
    this.imageSuccessMessage = null;
    this.imageErrorMessage = null;
    
    // Convertir la imagen a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      
      // Enviar directamente el string base64 como la imagen de perfil
      const profileImageData = { profileImage: base64String };

      this.authService.updateProfileImage(profileImageData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isImageLoading = false;
            this.imageSuccessMessage = 'Imagen de perfil actualizada correctamente';
            
            // Usar la imagen base64 directamente
            this.currentProfileImage = base64String;
            // Ya no es la imagen por defecto
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

  // Añadir método para eliminar la foto de perfil
  removeProfileImage(): void {
    this.isImageLoading = true;
    this.imageSuccessMessage = null;
    this.imageErrorMessage = null;
    
    const defaultImagePath = 'default-profile.png'; // El nombre que se guardará en la BD
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

  // Variables de visibilidad de contraseñas
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // Métodos para alternar la visibilidad de las contraseñas
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