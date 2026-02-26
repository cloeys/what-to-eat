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
        loadComponent: () =>
          import('./features/groups/group-list/group-list.component').then(
            m => m.GroupListComponent,
          ),
      },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '/login',
  },
];
