# Project: What To Eat

## What This App Does

This is an application which makes it possible to save, edit, share... recipes. Once a recipe has been saved, it can be made available for everyone, or saved only locally. Recipes contain a list of ingredients with the respective amount, the source from where the recipe was found and instructions as to how to prepare the recipe. Users can create groups so that every user in the group can add and view recipes. Recipes can be imported from various sources by specifying the URL and a dedicated scraper will have to be created for every source, but that will be in a later phase and I will delegate which scrapers will be created.

## Who Are You

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Tech Stack
- **Frontend:** Angular 21+ (standalone components, signals-based state)
- **Mobile:** Capacitor 6 for iOS/Android packaging
- **Backend/DB:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Styling:** Angular Material 3
- **Language:** TypeScript (strict mode always on)

## Code Style
- Always use `async/await` over `.then()` chains.
- Always handle errors explicitly — no silent `catch` blocks that swallow errors.
- Every public service method must have a JSDoc comment explaining what it does, its parameters, and what it returns.
- Prefer small, single-responsibility functions. If a function exceeds ~40 lines, it should probably be split.
- Use descriptive variable names. Never use single-letter variables outside of loop indices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer signal based forms instead of Reactive forms and Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Localization

- We will be using English as default language, but also implement Dutch localization
- Use `@angular/localize` for localization
- `ng-extract-i18n-merge` is installed and configured to extract text and create the localization files
- Localization resides in `src/localization/`
- Use static ids (eg `i18n=@@home-title`) in kebab-case
- Do NOT provide Dutch translations, those will be added manually
- **ALL user-visible text in component templates MUST have an `i18n` attribute with a static kebab-case ID** — no exceptions
- For text nodes inside control flow (`@if`, `@for`, etc.), wrap the text in `<ng-container i18n="@@id">` to avoid adding unwanted DOM elements (or use `i18n` directly on a semantic element if one is already present)
- Interpolations (e.g. `{{ user.name }}`) inside an `i18n`-tagged element are fully supported — Angular replaces them with placeholders during extraction; put `i18n` on the parent element
- Conditional text (different strings per state) must be split into separate `@if` blocks each with their own `i18n` attribute — never use ternary expressions inside interpolations for translatable text
- Dynamic runtime strings (e.g. server error messages) cannot be statically translated and do NOT need an `i18n` attribute

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Supabase Conventions
- The Supabase client is initialized once in `src/app/core/services/supabase.service.ts` and injected everywhere else.
- All database queries use **typed responses** — always define and use TypeScript interfaces matching the database schema.
- Row-Level Security (RLS) is enabled on all tables. Never disable it. If a query fails, fix the RLS policy, don't work around it.
- Database migrations go in `supabase/migrations/` with the naming format `YYYYMMDDHHMMSS_description.sql`.
- Never put secrets or service role keys in frontend code.
- `supabase/seed.sql` provides a seeding script for test data. It should be kept up-to-date with each migration.

## Testing
- Write a basic unit test for every new service method using Vitest.
- Do not write tests for simple component rendering unless asked.

## What NOT To Do
- Do not install new npm packages without asking me first and explaining why the package is needed.
- Do not refactor existing working code unless the task explicitly calls for it.
- Do not create barrel `index.ts` files — import directly from source files.
- Do not use `any` as a TypeScript type. Ever.

## Environment Variables
Supabase keys live in `src/environments/environment.ts` (never committed) and `src/environments/environment.example.ts` (committed as a template).

## Git Usage
- When starting on a new feature, ALWAYS create a new `feature/` branch
- This branch will be re-used until the feature has been manually checked and deemed complete
- Pull requests will be used to review the branch and will be merged back into the main branch
- For bug fixes, also always create a `bugfix/` branch, same strategy as feature branches