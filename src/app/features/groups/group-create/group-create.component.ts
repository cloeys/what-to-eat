import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupService } from '../../../core/services/group.service';

@Component({
  selector: 'app-group-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <a mat-icon-button routerLink="/groups" aria-label="Back to groups">
          <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
        </a>
        <h1>New group</h1>
      </div>

      @if (error()) {
        <p class="error-message">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="create-form">
        <mat-form-field appearance="outline">
          <mat-label>Group name</mat-label>
          <input
            matInput
            formControlName="name"
            maxlength="80"
            autocomplete="off"
            cdkFocusInitial />
          @if (form.controls.name.hasError('required')) {
            <mat-error>Group name is required</mat-error>
          } @else if (form.controls.name.hasError('maxlength')) {
            <mat-error>Name must be 80 characters or fewer</mat-error>
          }
          <mat-hint align="end">{{ form.controls.name.value.length }}/80</mat-hint>
        </mat-form-field>

        <div class="form-actions">
          <a mat-stroked-button routerLink="/groups">Cancel</a>
          <button mat-flat-button type="submit" [disabled]="loading()">
            @if (loading()) {
              <mat-progress-spinner mode="indeterminate" diameter="20" />
            }
            Create group
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    :host { display: block; }

    .page-container {
      max-width: 480px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
    }

    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 0;
    }

    .error-message {
      color: var(--mat-sys-error);
      margin-bottom: 16px;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    mat-form-field { width: 100%; }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
  `,
})
export class GroupCreateComponent {
  private readonly groupService = inject(GroupService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.groupService.createGroup(this.form.controls.name.value.trim());
      await this.router.navigate(['/groups']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create group. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
