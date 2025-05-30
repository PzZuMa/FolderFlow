import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';


// Componente para el diálogo de creación de carpeta
@Component({
  selector: 'app-create-folder-dialog',
  standalone: true,
  // Importación de módulos necesarios para el funcionamiento del diálogo
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
],
  // Plantilla HTML del diálogo de creación de carpeta
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="icon-container">
          <mat-icon>create_new_folder</mat-icon>
        </div>
        <div class="header-content">
          <h2 mat-dialog-title>Crear nueva carpeta</h2>
          <p class="dialog-subtitle">Introduce un nombre para la nueva carpeta</p>
        </div>
      </div>
      <mat-dialog-content>
        <!-- Campo de texto para el nombre de la carpeta -->
        <mat-form-field appearance="outline" class="full-width" [class.error-field]="hasError">
          <mat-label>Nombre de la carpeta</mat-label>
          <input matInput
            [(ngModel)]="folderName"
            cdkFocusInitial
            placeholder="Mi carpeta"
            maxlength="50"
            (keyup.enter)="onCreate()"
            (input)="onInputChange()"
            autocomplete="off">
            <mat-icon matSuffix class="folder-icon">folder</mat-icon>
            <mat-hint align="end">{{folderName.length}}/50</mat-hint>
          </mat-form-field>
          <!-- Mensaje de error si existe -->
          @if (errorMessage) {
            <div class="error-message">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>
          }
          <!-- Sugerencias de nombres si el usuario no ha interactuado -->
          @if (!folderName && !hasInteracted) {
            <div class="suggestions">
              <p class="suggestions-title">Sugerencias:</p>
              <div class="suggestion-chips">
                @for (suggestion of folderSuggestions; track suggestion) {
                  <button mat-button
                    class="suggestion-chip"
                    (click)="selectSuggestion(suggestion)">
                    {{ suggestion }}
                  </button>
                }
              </div>
            </div>
          }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-button class="cancel-button" (click)="onCancel()">
            Cancelar
          </button>
          <button mat-flat-button color="primary"
            [disabled]="!isValidName()"
            class="create-button"
            (click)="onCreate()">
            <mat-icon>add</mat-icon>
            <span>Crear carpeta</span>
          </button>
        </mat-dialog-actions>
      </div>
    `,
  // Estilos CSS específicos para el diálogo de creación de carpeta
  styles: [`
    .dialog-container {
      animation: dialogFadeIn 0.3s ease-out;
      padding: 0;
      border-radius: 12px;
      overflow: hidden;
      min-width: 400px;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      padding: 20px 24px 12px;
      gap: 16px;
      background: linear-gradient(135deg, rgba(255, 202, 40, 0.05) 0%, rgba(255, 202, 40, 0.02) 100%);
    }
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ffca28 0%, #f5bb00 100%);
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(255, 202, 40, 0.3);
    }
    .icon-container mat-icon {
      color: white;
      font-size: 24px;
      height: 24px;
      width: 24px;
    }
    .header-content {
      flex: 1;
    }
    mat-dialog-title {
      margin: 0 0 4px 0;
      font-size: 1.4rem;
      font-weight: 600;
      color: #2c3e50;
      letter-spacing: -0.01em;
    }
    .dialog-subtitle {
      margin: 0;
      font-size: 0.9rem;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 400;
    }
    mat-dialog-content {
      padding: 16px 24px 20px;
      margin: 0;
    }
    .full-width {
      width: 100%;
    }
    .error-field ::ng-deep .mat-form-field-outline {
      color: #dc3545 !important;
    }
    .error-field ::ng-deep .mat-form-field-label {
      color: #dc3545 !important;
    }
    .folder-icon {
      color: #ffca28 !important;
      transition: color 0.2s ease;
    }
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 12px;
      background-color: rgba(220, 53, 69, 0.1);
      border-radius: 6px;
      color: #dc3545;
      font-size: 0.85rem;
      animation: errorSlideIn 0.3s ease-out;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }
    .suggestions {
      margin-top: 16px;
      padding: 16px;
      background-color: rgba(255, 202, 40, 0.05);
      border-radius: 8px;
      border: 1px dashed rgba(255, 202, 40, 0.3);
    }
    .suggestions-title {
      margin: 0 0 12px 0;
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.7);
    }
    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .suggestion-chip {
      font-size: 0.8rem;
      padding: 4px 12px;
      min-height: 28px;
      border-radius: 16px;
      background-color: rgba(255, 202, 40, 0.1);
      color: #f5bb00;
      border: 1px solid rgba(255, 202, 40, 0.3);
      transition: all 0.2s ease;
      &:hover {
        background-color: rgba(255, 202, 40, 0.2);
        border-color: rgba(255, 202, 40, 0.5);
        transform: translateY(-1px);
      }
    }
    mat-dialog-actions {
      padding: 16px 24px 20px;
      margin: 0;
      gap: 12px;
      border-top: 1px solid rgba(0,0,0,0.06);
      background-color: #fafafa;
    }
    .create-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
      height: 42px;
      font-weight: 500;
      border-radius: 8px;
      background: linear-gradient(135deg, #ffca28 0%, #f5bb00 100%);
      color: #3c3c3c;
      box-shadow: 0 2px 4px rgba(255, 202, 40, 0.2);
      transition: all 0.2s ease;
      &:hover:not([disabled]) {
        background: linear-gradient(135deg, #f5bb00 0%, #e6a800 100%);
        box-shadow: 0 4px 12px rgba(255, 202, 40, 0.4);
        transform: translateY(-1px);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }
    .cancel-button {
      font-weight: 500;
      border-radius: 8px;
      height: 42px;
      color: #666;
      padding: 0 16px;
      transition: all 0.2s ease;
      &:hover {
        background-color: rgba(0,0,0,0.05);
        color: #333;
      }
    }
    @keyframes dialogFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes errorSlideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (max-width: 480px) {
      .dialog-container {
        min-width: 320px;
      }
      .dialog-header {
        padding: 16px 20px 8px;
      }
      mat-dialog-content {
        padding: 12px 20px 16px;
      }
      mat-dialog-actions {
        padding: 12px 20px 16px;
      }
      .suggestion-chips {
        flex-direction: column;
      }
      .suggestion-chip {
        align-self: flex-start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateFolderDialogComponent implements OnInit {
  // Nombre de la carpeta introducido por el usuario
  folderName: string = '';
  // Mensaje de error a mostrar si el nombre no es válido
  errorMessage: string = '';
  // Indica si hay un error en el campo de nombre
  hasError: boolean = false;
  // Indica si el usuario ha interactuado con el campo de texto
  hasInteracted: boolean = false;
  // Sugerencias de nombres de carpeta para mostrar al usuario
  folderSuggestions: string[] = [
    'Documentos',
    'Proyectos',
    'Imágenes',
    'Archivos Personales',
    'Trabajo',
    'Temporal'
  ];
  // Referencia al diálogo para poder cerrarlo
  private dialogRef = inject(MatDialogRef<CreateFolderDialogComponent>);
  // Referencia para detectar cambios manualmente
  private cdRef = inject(ChangeDetectorRef);
  // Expresión regular para caracteres no válidos en nombres de carpeta
  private readonly invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  // Lista de nombres reservados por el sistema
  private readonly reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

  // Al iniciar el componente, enfoca el campo de texto
  ngOnInit(): void {
    setTimeout(() => {
      const input = document.querySelector('input[matInput]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }

  // Se ejecuta al cambiar el valor del input
  onInputChange(): void {
    this.hasInteracted = true;
    this.validateFolderName();
    this.cdRef.markForCheck();
  }

  // Selecciona una sugerencia y la coloca en el campo de texto
  selectSuggestion(suggestion: string): void {
    this.folderName = suggestion;
    this.hasInteracted = true;
    this.validateFolderName();
    this.cdRef.markForCheck();
  }

  // Valida el nombre de la carpeta y actualiza los mensajes de error
  private validateFolderName(): void {
    this.errorMessage = '';
    this.hasError = false;
    const trimmedName = this.folderName.trim();
    if (!trimmedName) {
      return;
    }
    if (trimmedName.length > 50) {
      this.setError('El nombre no puede exceder 50 caracteres');
      return;
    }
    if (this.invalidChars.test(trimmedName)) {
      this.setError('El nombre contiene caracteres no válidos');
      return;
    }
    if (this.reservedNames.includes(trimmedName.toUpperCase())) {
      this.setError('Este nombre está reservado por el sistema');
      return;
    }
    if (trimmedName !== this.folderName || trimmedName.endsWith('.')) {
      this.setError('El nombre no puede empezar/terminar con espacios o puntos');
      return;
    }
    if (/^[\s.]+$/.test(trimmedName)) {
      this.setError('El nombre debe contener al menos un carácter válido');
      return;
    }
  }

  // Establece el mensaje de error y marca el campo como erróneo
  private setError(message: string): void {
    this.errorMessage = message;
    this.hasError = true;
  }

  // Verifica si el nombre ingresado es válido para habilitar el botón de crear
  isValidName(): boolean {
    const trimmedName = this.folderName.trim();
    return trimmedName.length > 0 && 
           trimmedName.length <= 50 && 
           !this.hasError && 
           !this.invalidChars.test(trimmedName) &&
           !this.reservedNames.includes(trimmedName.toUpperCase()) &&
           trimmedName === this.folderName &&
           !trimmedName.endsWith('.') &&
           !/^[\s.]+$/.test(trimmedName);
  }

  // Cierra el diálogo sin crear la carpeta
  onCancel(): void {
    this.dialogRef.close();
  }

  // Envía el nombre de la carpeta si es válido, o muestra errores si no lo es
  onCreate(): void {
    if (this.isValidName()) {
      this.dialogRef.close(this.folderName.trim());
    } else {
      this.validateFolderName();
      this.cdRef.markForCheck();
    }
  }
}