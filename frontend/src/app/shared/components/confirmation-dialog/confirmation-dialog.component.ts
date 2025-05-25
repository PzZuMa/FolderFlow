import { Component, inject, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

export interface ConfirmationDialogData {
  title?: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: string;
  type?: 'warning' | 'error' | 'info' | 'success';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container" [ngClass]="dialogType">
      <div class="dialog-header">
        <div class="icon-container">
          <mat-icon>{{ dialogIcon }}</mat-icon>
        </div>
        <h2 mat-dialog-title *ngIf="data.title">{{ data.title }}</h2>
      </div>
      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button class="cancel-button" (click)="onCancel()">
          {{ data.cancelButtonText || 'Cancelar' }}
        </button>
        <button mat-flat-button [color]="actionButtonColor" class="confirm-button" (click)="onConfirm()">
          <mat-icon *ngIf="actionButtonIcon">{{ actionButtonIcon }}</mat-icon>
          <span>{{ data.confirmButtonText || 'Confirmar' }}</span>
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
    }
    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px 0;
      gap: 16px;
    }
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dialog-message {
      font-size: 1rem;
      line-height: 1.6;
      color: #2c3e50;
    }
    mat-dialog-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
      letter-spacing: -0.01em;
    }
    mat-dialog-content {
      padding: 0 24px;
      margin: 16px 0;
      max-height: none;
    }
    mat-dialog-actions {
      padding: 16px 24px;
      margin-bottom: 0;
      gap: 12px;
      border-top: 1px solid rgba(0,0,0,0.06);
    }
    .confirm-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      height: 40px;
      font-weight: 500;
      border-radius: 8px;
    }
    .cancel-button {
      font-weight: 500;
      border-radius: 8px;
      height: 40px;
    }
    .warning .icon-container {
      background-color: rgba(255, 202, 40, 0.1);
    }
    .warning .icon-container mat-icon {
      color: #ffca28;
    }
    .error .icon-container {
      background-color: rgba(220, 53, 69, 0.1);
    }
    .error .icon-container mat-icon {
      color: #dc3545;
    }
    .success .icon-container {
      background-color: rgba(16, 185, 129, 0.1);
    }
    .success .icon-container mat-icon {
      color: #10b981;
    }
    .info .icon-container {
      background-color: rgba(107, 79, 187, 0.1);
    }
    .info .icon-container mat-icon {
      color: #6b4fbb;
    }
    @keyframes dialogFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData) {}

  get dialogType(): string {
    return this.data.type || 'warning';
  }
  
  get dialogIcon(): string {
    if (this.data.icon) return this.data.icon;
    switch (this.dialogType) {
      case 'error': return 'error_outline';
      case 'success': return 'check_circle_outline';
      case 'info': return 'info_outline';
      case 'warning':
      default: return 'warning_amber';
    }
  }
  
  get actionButtonColor(): string {
    switch (this.dialogType) {
      case 'error': return 'warn';
      case 'success': return 'primary';
      case 'info': return 'primary';
      case 'warning':
      default: return 'warn';
    }
  }
  
  get actionButtonIcon(): string | null {
    if (this.data.confirmButtonText?.toLowerCase().includes('eliminar')) {
      return 'delete_outline';
    }
    return null;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}