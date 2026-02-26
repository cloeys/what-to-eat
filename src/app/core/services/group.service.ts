import { computed, inject, Injectable, signal } from '@angular/core';
import { Database } from '../types/database.types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type Group = Database['public']['Tables']['groups']['Row'];

const ACTIVE_GROUP_KEY = 'activeGroupId';

/**
 * Manages the list of groups the current user belongs to and tracks
 * which group is currently active. The active group ID is persisted
 * to localStorage so it survives page reloads.
 */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private readonly _groups = signal<Group[]>([]);
  private readonly _activeGroupId = signal<string | null>(
    localStorage.getItem(ACTIVE_GROUP_KEY),
  );

  /** Read-only signal of all groups the current user is a member of. */
  readonly groups = this._groups.asReadonly();

  /** Read-only signal of the currently selected group ID. */
  readonly activeGroupId = this._activeGroupId.asReadonly();

  /** Computed signal of the full active group record, or null if none selected. */
  readonly activeGroup = computed(
    () => this._groups().find(g => g.id === this._activeGroupId()) ?? null,
  );

  /**
   * Resolves once the initial group list has been loaded from Supabase
   * (or immediately if the user is not authenticated at startup).
   */
  readonly initialized: Promise<void>;

  constructor() {
    this.initialized = this.auth.initialized.then(async () => {
      if (this.auth.isAuthenticated()) {
        await this.loadGroups();
      }
    });
  }

  /**
   * Fetches all groups the current user is a member of and updates the groups signal.
   * If the stored active group ID is no longer valid, auto-selects the first group.
   */
  async loadGroups(): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const { data, error } = await this.supabase
      .from('group_members')
      .select('groups(*)')
      .eq('user_id', userId)
      .order('joined_at');

    if (error) throw error;

    const groups = (data as { groups: Group | null }[])
      .map(m => m.groups)
      .filter((g): g is Group => g !== null);

    this._groups.set(groups);

    // Validate stored active group; auto-select first if not found
    const storedId = localStorage.getItem(ACTIVE_GROUP_KEY);
    if (groups.find(g => g.id === storedId)) {
      this._activeGroupId.set(storedId);
    } else if (groups.length > 0) {
      this.setActiveGroup(groups[0].id);
    }
  }

  /**
   * Sets the active group and persists the selection to localStorage.
   * @param groupId The ID of the group to make active.
   */
  setActiveGroup(groupId: string): void {
    this._activeGroupId.set(groupId);
    localStorage.setItem(ACTIVE_GROUP_KEY, groupId);
  }

  /**
   * Clears all group state. Should be called before signing the user out
   * to prevent stale data from being visible on the next sign-in.
   */
  resetGroups(): void {
    this._groups.set([]);
    this._activeGroupId.set(null);
    localStorage.removeItem(ACTIVE_GROUP_KEY);
  }
}
