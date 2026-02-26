import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { InvitationPreview, GroupService } from '../../../core/services/group.service';

@Component({
  selector: 'app-invitation-accept',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
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
            <p>You've joined <strong>{{ preview()?.group_name }}</strong>.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-flat-button routerLink="/recipes">Go to recipes</a>
          </mat-card-actions>
        } @else if (done() === 'declined') {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon">cancel</mat-icon>
            <h2>Invitation declined</h2>
            <p>You declined the invitation to join <strong>{{ preview()?.group_name }}</strong>.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-flat-button routerLink="/">Go to home</a>
          </mat-card-actions>
        } @else if (error()) {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon error-icon">error</mat-icon>
            <h2>Something went wrong</h2>
            <p>{{ error() }}</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-button routerLink="/">Go to home</a>
          </mat-card-actions>
        } @else if (!preview()) {
          <mat-card-content class="centered">
            <mat-icon fontSet="material-symbols-outlined" class="status-icon">link_off</mat-icon>
            <h2>Invitation not found</h2>
            <p>This invitation link is invalid, has already been used, or has expired.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-button routerLink="/">Go to home</a>
          </mat-card-actions>
        } @else {
          <mat-card-header>
            <mat-card-title>You've been invited</mat-card-title>
            <mat-card-subtitle>Join a group on What to Eat</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="group-info-box">
              <div class="group-name-row">
                <mat-icon fontSet="material-symbols-outlined" class="group-icon">group</mat-icon>
                <span class="group-name">{{ preview()!.group_name }}</span>
              </div>
              @if (preview()!.inviter_name) {
                <p class="invited-by">
                  Invited by <strong>{{ preview()!.inviter_name }}</strong>
                </p>
              }
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

    .group-info-box {
      border-radius: 12px;
      background: var(--mat-sys-surface-variant);
      margin-top: 8px;
      overflow: hidden;
    }

    .group-name-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .group-icon { font-size: 32px; width: 32px; height: 32px; flex-shrink: 0; }
    .group-name { font: var(--mat-sys-title-large); }

    .invited-by {
      padding: 8px 16px 12px;
      margin: 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class InvitationAcceptComponent implements OnInit {
  private readonly groupService = inject(GroupService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.paramMap.get('token')!;

  protected readonly preview = signal<InvitationPreview | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionLoading = signal<'accept' | 'decline' | null>(null);
  protected readonly done = signal<'accepted' | 'declined' | null>(null);

  async ngOnInit(): Promise<void> {
    await this.auth.initialized;

    if (!this.auth.isAuthenticated()) {
      // Persist the target URL so the callback can restore it after login/OAuth
      sessionStorage.setItem('auth_return_url', `/invitations/${this.token}`);
      await this.router.navigate(['/login']);
      return;
    }

    try {
      this.preview.set(await this.groupService.fetchInvitationPreview(this.token));
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
