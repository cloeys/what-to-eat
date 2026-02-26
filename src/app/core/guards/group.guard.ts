import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { GroupService } from '../services/group.service';

/**
 * Ensures that the group list is loaded before entering any group-scoped
 * route (recipes, calendar). The authGuard must run first to guarantee
 * the user is authenticated.
 *
 * Handles the post-login navigation case where GroupService.initialized
 * resolved before the user authenticated, resulting in an empty group list.
 */
export const groupGuard: CanActivateFn = async () => {
  const groupService = inject(GroupService);

  if (groupService.groups().length === 0) {
    await groupService.loadGroups();
  }

  return true;
};
