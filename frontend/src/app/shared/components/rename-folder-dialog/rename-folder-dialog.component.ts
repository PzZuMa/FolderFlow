import { Component, Inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

export interface RenameFolderDialogData {
  folderName: string;
  folderId: string;
}

@Component({
  selector: 'app-rename-folder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="icon-container">
          <mat-icon>edit</mat-icon>
        </div>
        <div class="header-content">
          <h2 mat-dialog-title>Renombrar carpeta</h2>
          <p class="dialog-subtitle">Introduce un nuevo nombre para la carpeta</p>
        </div>
      </div>
      <mat-dialog-content>
        <form [formGroup]="nameForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width" [class.error-field]="hasError">
            <mat-label>Nombre de la carpeta</mat-label>
            <input matInput 
                   formControlName="name"
                   cdkFocusInitial
                   placeholder="Mi carpeta"
                   maxlength="100"
                   (keyup.enter)="onSubmit()"
                   (input)="onInputChange()"
                   autocomplete="off">
            <mat-icon matSuffix class="folder-icon">folder</mat-icon>
            <mat-hint align="end">{{getCurrentLength()}}/100</mat-hint>
          </mat-form-field>
          <div class="error-message" *ngIf="errorMessage">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage }}</span>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button class="cancel-button" (click)="onCancel()">
          Cancelar
        </button>
        <button mat-flat-button color="primary" 
                [disabled]="!isValidName() || isLoading" 
                class="save-button" 
                (click)="onSubmit()">
          <mat-icon>save</mat-icon>
          <span>Guardar cambios</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
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
      background: linear-gradient(135deg, rgba(107, 79, 187, 0.05) 0%, rgba(107, 79, 187, 0.02) 100%);
    }
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6b4fbb 0%, #5a3fa3 100%);
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(107, 79, 187, 0.3);
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
      color: #6b4fbb !important;
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
    mat-dialog-actions {
      padding: 16px 24px 20px;
      margin: 0;
      gap: 12px;
      border-top: 1px solid rgba(0,0,0,0.06);
      background-color: #fafafa;
    }
    .save-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
      height: 42px;
      font-weight: 500;
      border-radius: 8px;
      background: linear-gradient(135deg, #6b4fbb 0%, #5a3fa3 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(107, 79, 187, 0.2);
      transition: all 0.2s ease;
      &:hover:not([disabled]) {
        background: linear-gradient(135deg, #5a3fa3 0%, #4a2f8a 100%);
        box-shadow: 0 4px 12px rgba(107, 79, 187, 0.4);
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
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RenameFolderDialogComponent implements OnInit {
  nameForm: FormGroup;
  isLoading = false;
  errorMessage: string = '';
  hasError: boolean = false;
  private readonly invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  private readonly reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RenameFolderDialogComponent>,
    private cdRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: RenameFolderDialogData
  ) {
    this.nameForm = this.fb.group({
      name: [
        this.data.folderName,
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100)
        ]
      ]
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      const input = document.querySelector('input[formControlName="name"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  onInputChange(): void {
    this.validateFolderName();
    this.cdRef.markForCheck();
  }

  private validateFolderName(): void {
    this.errorMessage = '';
    this.hasError = false;
    const control = this.nameForm.get('name');
    if (!control) return;
    const trimmedName = control.value?.trim() || '';
    if (!trimmedName) {
      return;
    }
    if (trimmedName.length > 100) {
      this.setError('El nombre no puede exceder 100 caracteres');
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
    if (trimmedName !== control.value || trimmedName.endsWith('.')) {
      this.setError('El nombre no puede empezar/terminar con espacios o puntos');
      return;
    }
    if (/^[\s.]+$/.test(trimmedName)) {
      this.setError('El nombre debe contener al menos un carácter válido');
      return;
    }
  }

  private setError(message: string): void {
    this.errorMessage = message;
    this.hasError = true;
  }

  getCurrentLength(): number {
    return this.nameForm.get('name')?.value?.length || 0;
  }

  isValidName(): boolean {
    const control = this.nameForm.get('name');
    if (!control) return false;
    const trimmedName = control.value?.trim() || '';
    return trimmedName.length > 0 && 
           trimmedName.length <= 100 && 
           !this.hasError && 
           !this.invalidChars.test(trimmedName) &&
           !this.reservedNames.includes(trimmedName.toUpperCase()) &&
           trimmedName === control.value &&
           !trimmedName.endsWith('.') &&
           !/^[\s.]+$/.test(trimmedName);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.isValidName() && !this.isLoading) {
      const newName = this.nameForm.value.name.trim();
      if (newName === this.data.folderName) {
        this.dialogRef.close();
        return;
      }
      this.dialogRef.close(newName);
    } else {
      this.validateFolderName();
      this.cdRef.markForCheck();
    }
  }
}