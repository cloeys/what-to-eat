import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { GroupService } from '../../../core/services/group.service';

@Component({
  selector: 'app-group-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatChipsModule, MatIconModule, MatListModule],
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
        <mat-list>
          @for (m of groupService.memberships(); track m.group.id) {
            <mat-list-item class="group-item">
              <span matListItemTitle>{{ m.group.name }}</span>
              <div matListItemMeta class="item-meta">
                <mat-chip-set>
                  <mat-chip [class]="'role-chip role-' + m.role" disableRipple>
                    {{ m.role }}
                  </mat-chip>
                </mat-chip-set>
                @if (m.role === 'admin') {
                  <a
                    mat-icon-button
                    [routerLink]="['/groups', m.group.id, 'settings']"
                    aria-label="Group settings">
                    <mat-icon fontSet="material-symbols-outlined">settings</mat-icon>
                  </a>
                }
              </div>
            </mat-list-item>
          }
        </mat-list>
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

    .group-item { height: auto !important; padding: 8px 0; }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-chip { font-size: 12px; min-height: 24px; }
    .role-admin { background-color: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .role-member { background-color: var(--mat-sys-surface-variant); color: var(--mat-sys-on-surface-variant); }
  `,
})
export class GroupListComponent {
  protected readonly groupService = inject(GroupService);
}
