import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { GroupService } from '../../../core/services/group.service';

@Component({
  selector: 'app-group-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatChipsModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Groups</h1>
        <a mat-flat-button routerLink="/groups/new">
          <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
          New group
        </a>
      </div>

      @if (groupService.memberships().length === 0) {
        <div class="empty-state">
          <mat-icon fontSet="material-symbols-outlined" class="empty-icon">group</mat-icon>
          <p>You're not in any groups yet.</p>
          <a mat-flat-button routerLink="/groups/new">Create your first group</a>
        </div>
      } @else {
        <div class="group-list">
          @for (m of groupService.memberships(); track m.group.id) {
            <div class="group-row">
              <span class="group-name">{{ m.group.name }}</span>
              <div class="row-actions">
                <mat-chip-set>
                  @if (m.group.is_personal) {
                    <mat-chip class="role-chip role-personal" disableRipple>personal</mat-chip>
                  } @else {
                    <mat-chip [class]="'role-chip role-' + m.role" disableRipple>
                      {{ m.role }}
                    </mat-chip>
                  }
                </mat-chip-set>
                @if (m.role === 'admin' && !m.group.is_personal) {
                  <a
                    mat-icon-button
                    [routerLink]="['/groups', m.group.id, 'settings']"
                    aria-label="Group settings">
                    <mat-icon fontSet="material-symbols-outlined">settings</mat-icon>
                  </a>
                } @else {
                  <!-- placeholder keeps chip vertically centred with rows that have a button -->
                  <span class="action-placeholder"></span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .page-container {
      max-width: 640px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.4;
    }

    .group-list { display: flex; flex-direction: column; }

    .group-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .group-row:last-child { border-bottom: none; }

    .group-name {
      font: var(--mat-sys-body-large);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    /* 40px matches the mat-icon-button touch target so chips align identically in every row */
    .action-placeholder { width: 40px; }

    .role-chip { font-size: 12px; min-height: 24px; }
    .role-admin    { background-color: var(--mat-sys-primary-container);   color: var(--mat-sys-on-primary-container); }
    .role-member   { background-color: var(--mat-sys-surface-variant);     color: var(--mat-sys-on-surface-variant); }
    .role-personal { background-color: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
  `,
})
export class GroupListComponent {
  protected readonly groupService = inject(GroupService);
}
