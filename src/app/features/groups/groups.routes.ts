import { Routes } from '@angular/router';

export const GROUPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./group-list/group-list.component').then(m => m.GroupListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./group-create/group-create.component').then(m => m.GroupCreateComponent),
  },
  {
    path: ':groupId/settings',
    loadComponent: () =>
      import('./group-settings/group-settings.component').then(m => m.GroupSettingsComponent),
  },
];
