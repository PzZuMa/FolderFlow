import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog'; // Import core dialog module
import { FormsModule } from '@angular/forms'; // Para ngModel
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-folder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Importar FormsModule
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Crear Nueva Carpeta</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nombre de la carpeta</mat-label>
        <input matInput [(ngModel)]="folderName" cdkFocusInitial>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!folderName.trim()" (click)="onCreate()">Crear</button>
    </mat-dialog-actions>
  `,
  styles: ['.full-width { width: 100%; }']
})
export class CreateFolderDialogComponent {
  folderName: string = '';
  private dialogRef = inject(MatDialogRef<CreateFolderDialogComponent>);

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.folderName?.trim()) {
      this.dialogRef.close(this.folderName.trim());
    }
  }
}