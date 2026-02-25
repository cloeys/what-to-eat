import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Handles the OAuth redirect after Google authenticates the user.
 *
 * Supabase's detectSessionInUrl (enabled by default) automatically exchanges
 * the PKCE code during getSession(), so auth.initialized resolves with the
 * session already present. Manual exchange is kept as a fallback only.
 */
@Component({
  selector: 'app-auth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinner],
  template: `
    <div class="callback-container">
      <mat-progress-spinner mode="indeterminate" diameter="48" />
      <p i18n="@@auth-callback-completing">Completing sign-in&hellip;</p>
    </div>
  `,
  styles: `
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 24px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;

    // Handle errors sent back by the OAuth provider (e.g. user cancelled).
    const oauthError = params.get('error');
    if (oauthError) {
      const description = params.get('error_description') ?? oauthError;
      await this.router.navigate(['/login'], { queryParams: { error: description } });
      return;
    }

    // Wait for AuthService to finish its initial getSession() call.
    // Because detectSessionInUrl is enabled by default, Supabase automatically
    // exchanges the PKCE code inside that call, so the session is already set
    // by the time this resolves — no manual exchange needed in the normal case.
    await this.auth.initialized;

    if (this.auth.isAuthenticated()) {
      await this.router.navigate(['/']);
      return;
    }

    // Fallback: detectSessionInUrl did not process the code (e.g. the client
    // was created with detectSessionInUrl: false). Exchange it manually.
    const code = params.get('code');
    if (code) {
      try {
        await this.auth.exchangeOAuthCode(code);
        await this.router.navigate(['/']);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed.';
        await this.router.navigate(['/login'], { queryParams: { error: message } });
      }
      return;
    }

    await this.router.navigate(['/login']);
  }
}
