import { computed, inject, Injectable, signal } from '@angular/core';
import { Database } from '../types/database.types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type GroupInvitation = Database['public']['Tables']['group_invitations']['Row'];
export type GroupRole = Database['public']['Enums']['group_role'];

/** The current user's membership in a single group, including their role. */
export interface MyGroupMembership {
  group: Group;
  role: GroupRole;
}

/** A group member record enriched with the member's public profile data. */
export interface GroupMemberWithProfile extends GroupMember {
  profiles: Profile | null;
}

/** An invitation record enriched with basic group info (id and name). */
export interface GroupInvitationWithGroup extends GroupInvitation {
  groups: { id: string; name: string } | null;
}

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
  private readonly _memberships = signal<MyGroupMembership[]>([]);
  private readonly _activeGroupId = signal<string | null>(
    localStorage.getItem(ACTIVE_GROUP_KEY),
  );

  /** Read-only signal of all groups the current user is a member of. */
  readonly groups = this._groups.asReadonly();

  /** Read-only signal of all group memberships (group + role) for the current user. */
  readonly memberships = this._memberships.asReadonly();

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
      .select('role, groups(*)')
      .eq('user_id', userId)
      .order('joined_at');

    if (error) throw new Error(error.message);

    const memberships = (data as { role: GroupRole; groups: Group | null }[])
      .filter((m): m is { role: GroupRole; groups: Group } => m.groups !== null)
      .map(m => ({ group: m.groups, role: m.role }));

    this._memberships.set(memberships);
    this._groups.set(memberships.map(m => m.group));

    // Validate stored active group; auto-select first if not found
    const storedId = localStorage.getItem(ACTIVE_GROUP_KEY);
    const groups = memberships.map(m => m.group);
    if (groups.find(g => g.id === storedId)) {
      this._activeGroupId.set(storedId);
    } else if (groups.length > 0) {
      this.setActiveGroup(groups[0].id);
    }
  }

  /**
   * Creates a new group via the create_group RPC (which atomically adds the
   * caller as admin), reloads the group list, and switches to the new group.
   * @param name Display name for the new group (1–80 characters).
   * @returns The newly created group record.
   */
  async createGroup(name: string): Promise<Group> {
    const { data: groupId, error } = await this.supabase.rpc('create_group', {
      p_name: name,
    });

    if (error) throw new Error(error.message);

    await this.loadGroups();

    const newGroup = this._groups().find(g => g.id === groupId);
    if (!newGroup) throw new Error('Created group not found after reload');

    this.setActiveGroup(newGroup.id);
    return newGroup;
  }

  /**
   * Renames an existing group. Requires the caller to be an admin of the group.
   * @param groupId The ID of the group to rename.
   * @param name The new display name.
   */
  async renameGroup(groupId: string, name: string): Promise<void> {
    const { error } = await this.supabase
      .from('groups')
      .update({ name: name.trim() })
      .eq('id', groupId);

    if (error) throw new Error(error.message);

    // Update the local signal so the shell nav reflects the new name immediately
    this._groups.update(gs =>
      gs.map(g => (g.id === groupId ? { ...g, name: name.trim() } : g)),
    );
    this._memberships.update(ms =>
      ms.map(m => (m.group.id === groupId ? { ...m, group: { ...m.group, name: name.trim() } } : m)),
    );
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
    this._memberships.set([]);
    this._activeGroupId.set(null);
    localStorage.removeItem(ACTIVE_GROUP_KEY);
  }

  // ── Member management ─────────────────────────────────────────────────────

  /**
   * Fetches all members of a group with their profile data.
   * Uses two separate queries because PostgREST cannot resolve the implicit
   * relationship between group_members.user_id and profiles.id (both reference
   * auth.users, but there is no direct FK between them in the public schema).
   * @param groupId The ID of the group whose members to fetch.
   */
  async fetchMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
    const { data: members, error: membersError } = await this.supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at');

    if (membersError) throw new Error(membersError.message);
    if (!members || members.length === 0) return [];

    const { data: profiles, error: profilesError } = await this.supabase
      .from('profiles')
      .select('*')
      .in('id', members.map(m => m.user_id));

    if (profilesError) throw new Error(profilesError.message);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
    return members.map(m => ({ ...m, profiles: profileMap.get(m.user_id) ?? null }));
  }

  /**
   * Removes a member from a group. Requires the caller to be an admin.
   * @param groupId The group to remove the member from.
   * @param userId  The ID of the user to remove.
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  /**
   * Removes the current user from a group via the leave_group RPC, which
   * atomically promotes another member to admin if the caller is the last admin.
   * Callers should navigate away after this resolves.
   * @param groupId The group to leave.
   */
  async leaveGroup(groupId: string): Promise<void> {
    const { error } = await this.supabase.rpc('leave_group', {
      p_group_id: groupId,
    });

    if (error) throw new Error(error.message);

    await this.loadGroups();
  }

  // ── Invitation management ─────────────────────────────────────────────────

  /**
   * Fetches all pending invitations for a group.
   * @param groupId The ID of the group whose pending invitations to fetch.
   */
  async fetchInvitations(groupId: string): Promise<GroupInvitation[]> {
    const { data, error } = await this.supabase
      .from('group_invitations')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Creates a pending invitation for the given email address.
   * Since email delivery is not yet implemented, the invitation token is
   * returned so the caller can display a shareable link.
   * @param groupId The group to invite the user to.
   * @param email   The email address of the person being invited.
   * @returns The invitation token (used to build the shareable link).
   */
  async inviteMember(groupId: string, email: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        email: email.toLowerCase().trim(),
        invited_by: this.auth.currentUser()!.id,
      })
      .select('token')
      .single();

    if (error) throw new Error(error.message);
    return data.token;
  }

  /**
   * Revokes a pending invitation by deleting it.
   * @param invitationId The ID of the invitation to revoke.
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('group_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw new Error(error.message);
  }

  /**
   * Looks up an invitation by its token. Works for both authenticated users
   * (who see invitations matching their email) and anonymous users (pre-login preview).
   * Returns null if not found.
   * @param token The invitation token from the URL.
   */
  async fetchInvitationByToken(token: string): Promise<GroupInvitationWithGroup | null> {
    const { data, error } = await this.supabase
      .from('group_invitations')
      .select('*, groups(id, name)')
      .eq('token', token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as GroupInvitationWithGroup | null;
  }

  /**
   * Accepts a pending invitation via the accept_invitation RPC.
   * Reloads the group list so the newly joined group appears immediately.
   * @param token The invitation token.
   */
  async acceptInvitation(token: string): Promise<void> {
    const { error } = await this.supabase.rpc('accept_invitation', {
      p_token: token,
    });

    if (error) throw new Error(error.message);

    await this.loadGroups();
  }

  /**
   * Declines a pending invitation via the decline_invitation RPC.
   * @param token The invitation token.
   */
  async declineInvitation(token: string): Promise<void> {
    const { error } = await this.supabase.rpc('decline_invitation', {
      p_token: token,
    });

    if (error) throw new Error(error.message);
  }
}
