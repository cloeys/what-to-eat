import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton],
  template: `
    <div class="home">
      <h1 i18n="@@home-greeting">Hello, {{ auth.currentUser()?.user_metadata?.['full_name'] ?? auth.currentUser()?.email }}!</h1>
      <p i18n="@@home-subtitle">What would you like to eat today?</p>
      <button mat-stroked-button (click)="auth.signOut()" i18n="@@home-signout">Sign out</button>
    </div>
  `,
  styles: `
    .home {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
      font: var(--mat-sys-body-large);
    }

    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 0;
    }

    p {
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
}
