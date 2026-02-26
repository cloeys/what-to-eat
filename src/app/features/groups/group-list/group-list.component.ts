import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Group list page. Full implementation in Phase 3 — Groups.
 */
@Component({
  selector: 'app-group-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 i18n="@@group-list-title">Groups</h1>
    <p i18n="@@group-list-placeholder">Group management coming soon.</p>
  `,
  styles: `
    :host {
      display: block;
    }

    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 0 0 16px;
    }
  `,
})
export class GroupListComponent {}
