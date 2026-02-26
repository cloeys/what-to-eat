import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Calendar view page. Full implementation in Phase 6 — Calendar.
 */
@Component({
  selector: 'app-calendar-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 i18n="@@calendar-view-title">Calendar</h1>
    <p i18n="@@calendar-view-placeholder">Meal calendar coming soon.</p>
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
export class CalendarViewComponent {}
