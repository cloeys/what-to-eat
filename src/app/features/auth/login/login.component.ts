import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle,
    MatDivider,
    MatError, MatFormField, MatHint, MatLabel,
    MatInput,
    MatProgressSpinner,
  ],
})
export class LoginComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly mode = signal<'signin' | 'signup'>('signin');
  protected readonly loading = signal<'google' | 'email' | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmationSent = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    const errorParam = this.route.snapshot.queryParamMap.get('error');
    if (errorParam) {
      this.error.set(errorParam);
    }

    await this.auth.initialized;
    if (this.auth.isAuthenticated()) {
      await this.router.navigate(['/']);
    }
  }

  protected switchMode(mode: 'signin' | 'signup'): void {
    this.mode.set(mode);
    this.error.set(null);
    this.confirmationSent.set(false);
    this.form.reset();

    const confirmCtrl = this.form.controls.confirmPassword;
    if (mode === 'signup') {
      confirmCtrl.setValidators([Validators.required]);
    } else {
      confirmCtrl.clearValidators();
    }
    confirmCtrl.updateValueAndValidity();
  }

  protected async signInWithGoogle(): Promise<void> {
    this.loading.set('google');
    this.error.set(null);
    try {
      await this.auth.signInWithGoogle();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      this.loading.set(null);
    }
  }

  protected async submitEmailForm(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set('email');
    this.error.set(null);

    const { email, password, confirmPassword } = this.form.getRawValue();

    try {
      if (this.mode() === 'signup') {
        if (password !== confirmPassword) {
          this.error.set('Passwords do not match.');
          this.loading.set(null);
          return;
        }
        await this.auth.signUpWithEmail(email, password);
        if (this.auth.isAuthenticated()) {
          await this.router.navigate(['/']);
        } else {
          this.confirmationSent.set(true);
        }
      } else {
        await this.auth.signInWithEmail(email, password);
        await this.router.navigate(['/']);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      this.loading.set(null);
    }
  }
}
