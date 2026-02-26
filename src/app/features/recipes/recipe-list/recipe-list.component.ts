import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Recipe list page. Full implementation in Phase 4 — Recipe Management.
 */
@Component({
  selector: 'app-recipe-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 i18n="@@recipe-list-title">Recipes</h1>
    <p i18n="@@recipe-list-placeholder">Recipe management coming soon.</p>
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
export class RecipeListComponent {}
