import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects routes from unauthenticated access.
 * Waits for the initial session to load before evaluating auth state,
 * then redirects to /login if the user is not signed in.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialized;

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
