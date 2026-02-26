import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import {
  GroupInvitation,
  GroupMemberWithProfile,
  GroupService,
} from '../../../core/services/group.service';

@Component({
  selector: 'app-group-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './group-settings.component.html',
  styleUrl: './group-settings.component.css',
})
export class GroupSettingsComponent implements OnInit {
  private readonly groupService = inject(GroupService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId')!;

  protected readonly group = computed(
    () => this.groupService.groups().find(g => g.id === this.groupId) ?? null,
  );

  protected readonly isAdmin = computed(
    () =>
      this.groupService.memberships().find(m => m.group.id === this.groupId)?.role === 'admin',
  );

  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');

  // Async data
  protected readonly members = signal<GroupMemberWithProfile[]>([]);
  protected readonly invitations = signal<GroupInvitation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // Rename form state
  protected readonly renameForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
  });
  protected readonly renameLoading = signal(false);
  protected readonly renameSuccess = signal(false);

  // Invite form state
  protected readonly inviteForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  protected readonly inviteLoading = signal(false);
  protected readonly inviteLink = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [members, invitations] = await Promise.all([
        this.groupService.fetchMembers(this.groupId),
        this.isAdmin() ? this.groupService.fetchInvitations(this.groupId) : Promise.resolve([]),
      ]);
      this.members.set(members);
      this.invitations.set(invitations);
      this.renameForm.controls.name.setValue(this.group()?.name ?? '');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load group settings.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async rename(): Promise<void> {
    if (this.renameForm.invalid) {
      this.renameForm.markAllAsTouched();
      return;
    }
    this.renameLoading.set(true);
    this.error.set(null);
    try {
      await this.groupService.renameGroup(this.groupId, this.renameForm.controls.name.value);
      this.renameSuccess.set(true);
      setTimeout(() => this.renameSuccess.set(false), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to rename group.');
    } finally {
      this.renameLoading.set(false);
    }
  }

  protected async removeMember(userId: string): Promise<void> {
    this.error.set(null);
    try {
      await this.groupService.removeMember(this.groupId, userId);
      this.members.update(ms => ms.filter(m => m.user_id !== userId));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to remove member.');
    }
  }

  protected async revokeInvitation(invitationId: string): Promise<void> {
    this.error.set(null);
    try {
      await this.groupService.revokeInvitation(invitationId);
      this.invitations.update(is => is.filter(i => i.id !== invitationId));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to revoke invitation.');
    }
  }

  protected async inviteMember(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    this.inviteLoading.set(true);
    this.inviteLink.set(null);
    this.error.set(null);
    try {
      const token = await this.groupService.inviteMember(
        this.groupId,
        this.inviteForm.controls.email.value,
      );
      this.inviteLink.set(`${window.location.origin}/invitations/${token}`);
      this.inviteForm.reset();
      // Refresh invitations list
      const invitations = await this.groupService.fetchInvitations(this.groupId);
      this.invitations.set(invitations);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create invitation.');
    } finally {
      this.inviteLoading.set(false);
    }
  }

  protected memberDisplayName(member: GroupMemberWithProfile): string {
    return member.profiles?.display_name ?? member.user_id;
  }
}
