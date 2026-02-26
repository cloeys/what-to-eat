import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  /** 'warn' renders the confirm button in the error/danger colour */
  confirmColor?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button
        mat-flat-button
        [class.warn-button]="data.confirmColor === 'warn'"
        [mat-dialog-close]="true">
        {{ data.confirmLabel ?? 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .warn-button {
      background-color: var(--mat-sys-error);
      color: var(--mat-sys-on-error);
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
