import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { GroupInvitationWithGroup, GroupService } from '../../../core/services/group.service';

@Component({
  selector: 'app-invitation-accept',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <mat-card class="invitation-card">

        @if (loading()) {
          <mat-card-content class="centered">
            <mat-progress-spinner mode="indeterminate" diameter="48" />
            <p>Loading invitation…</p>
          </mat-card-content>
        } @else if (done() === 'accepted') {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon success-icon">check_circle</mat-icon>
            <h2>You're in!</h2>
            <p>You've joined <strong>{{ invitation()?.groups?.name }}</strong>. Redirecting…</p>
          </mat-card-content>
        } @else if (done() === 'declined') {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon">cancel</mat-icon>
            <h2>Invitation declined</h2>
            <p>You declined the invitation to join <strong>{{ invitation()?.groups?.name }}</strong>.</p>
          </mat-card-content>
        } @else if (error()) {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon error-icon">error</mat-icon>
            <h2>Something went wrong</h2>
            <p>{{ error() }}</p>
          </mat-card-content>
        } @else if (!invitation()) {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon">link_off</mat-icon>
            <h2>Invitation not found</h2>
            <p>This invitation link is invalid, has already been used, or has expired.</p>
          </mat-card-content>
        } @else {
          <mat-card-header>
            <mat-card-title>You've been invited</mat-card-title>
            <mat-card-subtitle>Join a group on What to Eat</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="group-name-display">
              <mat-icon fontSet="material-symbols-outlined" class="group-icon">group</mat-icon>
              <span class="group-name">{{ invitation()?.groups?.name }}</span>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-stroked-button [disabled]="actionLoading() !== null" (click)="decline()">
              @if (actionLoading() === 'decline') {
                <mat-progress-spinner mode="indeterminate" diameter="20" />
              }
              Decline
            </button>
            <button mat-flat-button [disabled]="actionLoading() !== null" (click)="accept()">
              @if (actionLoading() === 'accept') {
                <mat-progress-spinner mode="indeterminate" diameter="20" />
              }
              Accept invitation
            </button>
          </mat-card-actions>
        }

      </mat-card>
    </div>
  `,
  styles: `
    :host { display: block; }

    .page-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .invitation-card {
      width: 100%;
      max-width: 440px;
    }

    .centered {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 16px;
      text-align: center;
    }

    .status-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    .success-icon { color: var(--mat-sys-primary); }
    .error-icon   { color: var(--mat-sys-error); }

    h2 { font: var(--mat-sys-headline-small); margin: 0; }
    p  { margin: 0; }

    .group-name-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      background: var(--mat-sys-surface-variant);
      margin-top: 8px;
    }

    .group-icon { font-size: 32px; width: 32px; height: 32px; }
    .group-name { font: var(--mat-sys-title-large); }
  `,
})
export class InvitationAcceptComponent implements OnInit {
  private readonly groupService = inject(GroupService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.paramMap.get('token')!;

  protected readonly invitation = signal<GroupInvitationWithGroup | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionLoading = signal<'accept' | 'decline' | null>(null);
  protected readonly done = signal<'accepted' | 'declined' | null>(null);

  async ngOnInit(): Promise<void> {
    await this.auth.initialized;

    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/invitations/${this.token}` },
      });
      return;
    }

    try {
      const inv = await this.groupService.fetchInvitationByToken(this.token);
      this.invitation.set(inv);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load invitation.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async accept(): Promise<void> {
    this.actionLoading.set('accept');
    this.error.set(null);
    try {
      await this.groupService.acceptInvitation(this.token);
      this.done.set('accepted');
      setTimeout(() => this.router.navigate(['/recipes']), 2000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to accept invitation.');
      this.actionLoading.set(null);
    }
  }

  protected async decline(): Promise<void> {
    this.actionLoading.set('decline');
    this.error.set(null);
    try {
      await this.groupService.declineInvitation(this.token);
      this.done.set('declined');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to decline invitation.');
      this.actionLoading.set(null);
    }
  }
}
