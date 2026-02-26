import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { groupGuard } from './core/guards/group.guard';

export const routes: Routes = [
  // ── Public routes ──────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/callback/callback.component').then(m => m.AuthCallbackComponent),
  },
  {
    // Public invitation acceptance — no auth guard; the component handles
    // unauthenticated users by redirecting to /login?returnUrl=...
    path: 'invitations/:token',
    loadComponent: () =>
      import('./features/groups/invitation-accept/invitation-accept.component').then(
        m => m.InvitationAcceptComponent,
      ),
  },

  // ── Authenticated shell (all protected routes render inside ShellComponent) ─
  {
    path: '',
    canActivate: [authGuard, groupGuard],
    loadComponent: () =>
      import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'recipes',
        pathMatch: 'full',
      },
      {
        path: 'recipes',
        loadComponent: () =>
          import('./features/recipes/recipe-list/recipe-list.component').then(
            m => m.RecipeListComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar-view/calendar-view.component').then(
            m => m.CalendarViewComponent,
          ),
      },
      {
        path: 'groups',
        loadChildren: () =>
          import('./features/groups/groups.routes').then(m => m.GROUPS_ROUTES),
      },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '/login',
  },
];
