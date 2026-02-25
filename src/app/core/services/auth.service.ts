import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

/**
 * Manages authentication state via Supabase.
 * Exposes reactive signals for the current session and user, and provides
 * methods for signing in with Google OAuth or email/password, and signing out.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(null);

  readonly session = this._session.asReadonly();
  readonly currentUser = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);

  /** Resolves once the initial session has been loaded from storage. */
  readonly initialized: Promise<void>;

  constructor() {
    this.initialized = this.supabase.auth.getSession().then(({ data }) => {
      this._session.set(data.session);
    });

    this.supabase.auth.onAuthStateChange((_, session) => {
      this._session.set(session);
    });
  }

  /**
   * Exchanges a PKCE authorization code (received via OAuth redirect) for a session.
   * Explicitly updates the session signal so auth state is guaranteed to be current
   * before the caller continues — avoiding race conditions with onAuthStateChange.
   */
  async exchangeOAuthCode(code: string): Promise<void> {
    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    this._session.set(data.session);
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    await this.router.navigate(['/login']);
  }
}
