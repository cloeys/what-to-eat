# What to Eat — Implementation Planning Document

> Last updated: 2026-02-25
> Status: Living document — update as decisions are made during implementation.

---

## 1. Overview

**What to Eat** is a collaborative recipe management and meal-planning web application built with Angular 21 and Supabase. It lets households, families, or friend groups collect and organise recipes together, search through them intelligently, and plan a weekly/monthly meal calendar without any data ever being deleted.

### Technology Stack

| Layer | Choice |
|---|---|
| Frontend framework | Angular 21 (standalone components, OnPush, Signals) |
| UI library | Angular Material 3 (CSS-variable theming) |
| Backend | Supabase v2 (Postgres + Auth + RLS + future: Storage) |
| Mobile wrapper | Capacitor 8 (Android) |
| Auth | Google OAuth (PKCE) + email/password — already implemented |
| Type safety | `database.types.ts` auto-generated from schema via `npx supabase gen types typescript --local` |

### Goals

1. Give individuals a single place to save and scale recipes.
2. Let groups (household, family) share a recipe collection with fine-grained access control.
3. Provide a lightweight meal calendar so the group always knows what is planned for the week.
4. Lay the groundwork for recipe import via URL scraping and photo uploads (out of scope now but the data model anticipates them).

---

## 2. User Stories

### Epic: Recipe Management

**RM-01** — As a group member, I can create a new recipe with a name, optional description, prep time, cook time, and servings count, so that I can save a recipe to the group's collection.

Acceptance criteria:
- Form requires: name (required), prep_time_minutes (≥ 0), cook_time_minutes (≥ 0), servings (≥ 1, default 4).
- Description, source, and photo_url are optional.
- Recipe is saved to the currently active group.
- `created_by` is set to the current authenticated user's ID.
- Redirect to the recipe detail view on save.

**RM-02** — As a group member, I can add an ordered list of ingredients to a recipe, each with a name, optional amount, optional measurement unit, and optional note, so that the recipe is complete and reproducible.

Acceptance criteria:
- Ingredients have: name (required), amount (optional decimal), measurement_id (nullable FK to `measurements`), notes (optional free text).
- Ingredients can be reordered via up/down buttons or drag-and-drop; `sort_order` persists.
- Ingredient names autocomplete from `ingredients` (group-scoped name lookup).
- At least one ingredient is recommended but not enforced.

**RM-03** — As a group member, I can add an ordered list of preparation steps to a recipe, so that anyone in the group can follow the instructions.

Acceptance criteria:
- Each step has a `step_number` (1-based, auto-assigned) and a `description` (required, multiline text).
- Steps can be reordered; `step_number` is updated accordingly.
- At least one step is recommended but not enforced.

**RM-04** — As a group member, I can tag a recipe with one or more group-defined tags, so that I can categorise and later filter by category.

Acceptance criteria:
- Tags are created inline (type-and-create pattern) or selected from existing group tags.
- Tags are group-scoped (not shared between groups).
- A recipe can have zero or more tags.

**RM-05** — As a group member, I can set the servings count for my current view of a recipe, so that ingredient amounts scale proportionally.

Acceptance criteria:
- A servings control appears on the recipe detail page; it defaults to `recipe.servings`.
- Changing it multiplies all ingredient `amount` values proportionally (display-only, not saved).
- Non-numeric amounts (null `amount`, null units) are shown as-is without scaling.

**RM-06** — As a group member, I can edit any recipe in my group, so that the collection stays up to date.

Acceptance criteria:
- All fields editable (same form as creation).
- Ingredients and steps are fully editable (add, remove, reorder).
- `updated_at` is updated on save.
- Any group member (not just the creator) can edit.

**RM-07** — As a group member, I can delete a recipe from the group, so that outdated recipes are removed.

Acceptance criteria:
- Confirmation dialog before deletion.
- All child records (recipe_ingredients, recipe_steps, recipe_tags) are cascade-deleted via FK constraints.
- User is redirected to the recipe list after deletion.

**RM-08 🔮 Future** — As a group member, I can import a recipe by pasting a URL, so that I do not have to type out a recipe found online.

Acceptance criteria (future):
- URL field in recipe creation triggers a scraper (edge function or third-party service).
- Scraped fields pre-populate the form; user can edit before saving.
- `source` is set to the original URL.

**RM-09 🔮 Future** — As a group member, I can upload a photo for a recipe, so that the recipe card displays a visual preview.

Acceptance criteria (future):
- Photo stored in Supabase Storage bucket `recipe-photos`, path `{group_id}/{recipe_id}.{ext}`.
- `photo_url` column stores the public URL.
- Max 5 MB, JPEG/PNG/WebP only.

---

### Epic: Search and Discovery

**SD-01** — As a group member, I can search recipes by name, so that I can quickly find a specific dish.

Acceptance criteria:
- Case-insensitive substring or full-text search on `recipes.name`.
- Results update reactively as the user types (debounced 300 ms).
- Empty search shows all group recipes.

**SD-02** — As a group member, I can filter recipes by one or more tags, so that I can browse by category.

Acceptance criteria:
- Multi-select chip input; selecting multiple tags returns recipes matching ANY selected tag (OR semantics).
- Tag filter is combinable with name search.

**SD-03** — As a group member, I can filter recipes by maximum total time (prep + cook), so that I can find quick meals for busy nights.

Acceptance criteria:
- Preset options: ≤15 min, ≤30 min, ≤45 min, ≤60 min, any.
- Computed as `prep_time_minutes + cook_time_minutes ≤ selected threshold`.

**SD-04** — As a group member, I can filter recipes by source, so that I can browse recipes from a specific book or website.

Acceptance criteria:
- Free-text input; case-insensitive substring match on `recipes.source`.

**SD-05** — As a group member, I can filter recipes by ingredient name, so that I can find what to cook with ingredients I have on hand.

Acceptance criteria:
- Free-text input for one or more ingredient names; recipes must contain ALL listed ingredients (AND semantics via a JOIN against `recipe_ingredients`).

---

### Epic: Groups

**GR-01** — As a new user, my personal group is automatically created when I sign up, so that I can start adding recipes immediately without any setup.

Acceptance criteria:
- Triggered by a PostgreSQL function `handle_new_user()` on the `auth.users` insert trigger.
- Personal group is named `"{display_name}'s Recipes"` (falling back to the email prefix).
- User is automatically added as the group's `admin`.
- A row is inserted into `profiles` for the new user at the same time.

**GR-02** — As an authenticated user, I can create a new group and name it, so that I can start a shared recipe collection with others.

Acceptance criteria:
- Group name is required (max 80 characters).
- Creator is automatically added as `admin`.
- New group appears in the user's group switcher immediately.

**GR-03** — As a group admin, I can invite another user to the group by email address, so that they can collaborate on the recipe collection.

Acceptance criteria:
- A row is inserted into `group_invitations` with `status = 'pending'`, a generated token, and an expiry 7 days from now.
- An email is sent to the invitee (Supabase Edge Function or Resend integration — implementation detail deferred).
- Only one `pending` invitation per email per group at a time (partial unique index).
- Admins can see a list of pending invitations and revoke them.

**GR-04** — As an invited user, I can accept or decline a group invitation, so that I control which groups I join.

Acceptance criteria:
- Invitation is accessed via a link containing the token (route `/invitations/:token`).
- Accepting inserts a row into `group_members` with `role = 'member'` and sets `status = 'accepted'` on the invitation.
- Declining sets `status = 'declined'`.
- Expired invitations (past `expires_at`) show an error and cannot be acted upon.

**GR-05** — As an authenticated user, I can switch between groups I belong to, so that I see the recipes and calendar for the selected group.

Acceptance criteria:
- A group selector (dropdown or side-nav section) is always visible when authenticated.
- The active group ID is stored in application state (a signal in a `GroupService`).
- All data queries use the active group ID as a filter.

**GR-06** — As a group admin, I can remove a member from the group, so that former members can no longer see or edit the group's recipes.

Acceptance criteria:
- Admin can see a member list with a "Remove" action.
- Removing deletes the `group_members` row; RLS immediately revokes access.
- An admin cannot remove themselves if they are the only admin.

**GR-07** — As a group admin, I can rename the group, so that the name stays relevant.

Acceptance criteria:
- Name field in group settings; same validation as creation.

---

### Epic: Calendar

**CA-01** — As a group member, I can add a meal plan entry for a specific date, so that the group knows what is being cooked that day.

Acceptance criteria:
- An entry has: `group_id`, `date` (DATE, unique per group per day), and either `recipe_id` (FK) or `free_text` (plain text) or both.
- Optional `notes` field (e.g. "double batch").
- `planned_by` stores the user who created the entry.
- Unique constraint: one entry per `(group_id, date)`.

**CA-02** — As a group member, I can view the meal calendar for my group, so that I can see what has been planned.

Acceptance criteria:
- Month view (default) and week view.
- Entries in the past are shown normally (no deletion, full history).
- Days with a recipe link show the recipe name; days with free text show the text.

**CA-03** — As a group member, I can edit or replace a calendar entry for any date, so that plans can change.

Acceptance criteria:
- Edit in-place or via a dialog.
- Any group member can edit (not just the `planned_by` user).

**CA-04** — As a group member, I can remove a calendar entry, so that a day is left unplanned.

Acceptance criteria:
- Confirmation prompt before deletion.
- The row is deleted; no soft-delete needed for calendar entries.

**CA-05** — As a group member, I can click a calendar entry's linked recipe to navigate to the recipe detail, so that I can view cooking instructions directly from the calendar.

Acceptance criteria:
- Recipe name is a link/button on the calendar entry.
- Navigates to `/recipes/:recipeId` (within the active group context).

---

## 3. Data Model

### 3.1 Schema SQL

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid(), gen_random_bytes()


-- ============================================================
-- ENUMS
-- ============================================================
create type public.group_role as enum ('admin', 'member');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'expired');


-- ============================================================
-- PROFILES
-- Mirrors auth.users; one row per authenticated user.
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is
  'Public-facing user data mirroring auth.users. Created automatically on signup.';


-- ============================================================
-- GROUPS
-- ============================================================
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.groups is
  'A named collection of recipes and a calendar. One personal group is auto-created per user.';


-- ============================================================
-- GROUP MEMBERS
-- ============================================================
create table public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
comment on table public.group_members is
  'Junction table tracking which users belong to which groups and their role.';


-- ============================================================
-- GROUP INVITATIONS
-- ============================================================
create table public.group_invitations (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  status     public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
comment on table public.group_invitations is
  'Pending and historical invitations to join a group via email.';

-- Only one pending invitation per group+email at a time
create unique index group_invitations_pending_unique
  on public.group_invitations (group_id, email)
  where status = 'pending';


-- ============================================================
-- MEASUREMENTS (global reference table)
-- ============================================================
create table public.measurements (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,   -- e.g. 'cup'
  abbreviation text,                   -- e.g. 'c'
  sort_order   int not null default 0
);
comment on table public.measurements is
  'Global reference table of measurement units. Seeded; not user-editable.';


-- ============================================================
-- TAGS (group-scoped)
-- ============================================================
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);
comment on table public.tags is
  'User-defined recipe tags scoped to a group.';


-- ============================================================
-- INGREDIENTS (group-scoped name registry for autocomplete)
-- ============================================================
create table public.ingredients (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);
comment on table public.ingredients is
  'Group-scoped ingredient name registry used for autocomplete. '
  'A new row is upserted whenever a new ingredient name is used in a recipe.';


-- ============================================================
-- RECIPES
-- ============================================================
create table public.recipes (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 200),
  description       text,
  prep_time_minutes int not null default 0 check (prep_time_minutes >= 0),
  cook_time_minutes int not null default 0 check (cook_time_minutes >= 0),
  servings          int not null default 4 check (servings >= 1),
  source            text,        -- display name, book title, or URL (future)
  photo_url         text,        -- 🔮 populated by Storage upload (future)
  created_by        uuid not null references auth.users(id) on delete restrict,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.recipes is
  'Core recipe record. Ingredients, steps and tags are in separate child tables.';

create index recipes_group_id_idx on public.recipes (group_id);
create index recipes_name_search_idx on public.recipes using gin (to_tsvector('english', name));


-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================
create table public.recipe_ingredients (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      uuid not null references public.recipes(id) on delete cascade,
  name           text not null,              -- denormalised for fast display
  amount         numeric(10, 3),             -- null = unquantified ("to taste")
  measurement_id uuid references public.measurements(id) on delete set null,
  notes          text,                       -- e.g. "finely chopped"
  sort_order     int not null default 0
);
comment on table public.recipe_ingredients is
  'Ordered list of ingredients for a recipe. '
  'Name is denormalised; the ingredients table is for autocomplete only.';

create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);


-- ============================================================
-- RECIPE STEPS
-- ============================================================
create table public.recipe_steps (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  step_number int not null check (step_number >= 1),
  description text not null,
  unique (recipe_id, step_number)
);
comment on table public.recipe_steps is
  'Ordered preparation steps for a recipe.';

create index recipe_steps_recipe_id_idx on public.recipe_steps (recipe_id);


-- ============================================================
-- RECIPE TAGS (junction)
-- ============================================================
create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id    uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);
comment on table public.recipe_tags is
  'Many-to-many junction between recipes and tags.';


-- ============================================================
-- CALENDAR ENTRIES
-- ============================================================
create table public.calendar_entries (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  date       date not null,
  recipe_id  uuid references public.recipes(id) on delete set null,
  free_text  text,
  notes      text,
  planned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One entry per group per day
  unique (group_id, date),
  -- At least one of recipe_id or free_text must be present
  check (recipe_id is not null or (free_text is not null and free_text <> ''))
);
comment on table public.calendar_entries is
  'Meal plan entries for a group. One entry per group per date. History is never deleted.';

create index calendar_entries_group_date_idx on public.calendar_entries (group_id, date desc);


-- ============================================================
-- UPDATED_AT TRIGGER (shared function)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create trigger set_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create trigger set_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute function public.set_updated_at();


-- ============================================================
-- AUTO-CREATE PROFILE + PERSONAL GROUP ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_display_name text;
  v_group_id     uuid;
begin
  -- Derive display name: Google full_name > email prefix
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  -- Insert profile
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_display_name,
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create personal group
  insert into public.groups (name, created_by)
  values (v_display_name || '''s Recipes', new.id)
  returning id into v_group_id;

  -- Add user as admin of their personal group
  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, new.id, 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3.2 RLS Policies

> Full SQL for each policy will be in `supabase/migrations/20260225000001_rls_policies.sql`. The table below defines the intent.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Any authenticated user can read any profile. | Disallowed — created by trigger. | User can update their own row only. | Disallowed. |
| `groups` | Members of the group only (via `group_members` join). | Any authenticated user can create a group. | Admin of the group only. | Admin only. |
| `group_members` | Members of the same group can see each other. | Only via app logic (accept invitation or trigger). Direct insert blocked. | Admin can update roles. | Admin can remove others; user can remove themselves. |
| `group_invitations` | Admin of the group. Invitee can view by token (anon or authenticated). | Admin of the group only. | Invitee can update `status` via token. Admin can revoke. | Admin only. |
| `measurements` | All authenticated users (read-only reference data). | Disallowed. | Disallowed. | Disallowed. |
| `tags` | Any member of the group. | Any member of the group. | Any member of the group. | Any member of the group. |
| `ingredients` | Any member of the group. | Any member of the group (upsert on recipe save). | Any member of the group. | Any member of the group. |
| `recipes` | Any member of the group. | Any member of the group. | Any member of the group. | Any member of the group. |
| `recipe_ingredients` | Any member of the group owning the recipe. | Same. | Same. | Same. |
| `recipe_steps` | Same as `recipe_ingredients`. | Same. | Same. | Same. |
| `recipe_tags` | Same as `recipe_ingredients`. | Same. | Same. | Same. |
| `calendar_entries` | Any member of the group. | Any member of the group. | Any member of the group. | Any member of the group. |

**Helper functions used in RLS policies:**

```sql
-- Returns true if the calling user is a member of the given group.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
  );
$$;

-- Returns true if the calling user is an admin of the given group.
create or replace function public.is_group_admin(p_group_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'admin'
  );
$$;
```

---

## 4. Seed Data

### Purpose

The seed file populates a local Supabase instance with realistic data for development and testing. It uses fixed UUIDs so that the seed is idempotent and developers can reference known IDs in tests.

### Important: Inserting into `auth.users`

Supabase's `auth` schema is managed by the Auth service. For local seeding:

- Insert rows **directly into `auth.users`** using raw SQL in `supabase/seed.sql`.
- Set `raw_user_meta_data` with `full_name` and `avatar_url` to simulate Google OAuth users.
- The `handle_new_user` trigger will fire automatically, creating `profiles` and personal groups — **do not manually insert those rows**.
- Use `is_sso_user = false`, `email_confirmed_at = now()`, `aud = 'authenticated'`, `role = 'authenticated'`.

### Seed Contents

**Users (3)** — inserted into `auth.users`:

| UUID | Name | Email |
|---|---|---|
| `00000000-0000-0000-0000-000000000001` | Alice Martin | alice@example.com |
| `00000000-0000-0000-0000-000000000002` | Bob Chen | bob@example.com |
| `00000000-0000-0000-0000-000000000003` | Carol Davis | carol@example.com |

After insert, the trigger creates three personal groups. The seed then manually creates one additional shared group.

**Shared Group (1):** "The Family Kitchen" — Alice (admin), Bob (member), Carol (member)

**Measurements (seeded globally, 12 units):** teaspoon, tablespoon, cup, millilitre, litre, gram, kilogram, ounce, pound, piece, pinch, to taste

**Tags (in shared group):** pasta, main course, quick, vegetarian, breakfast

**Recipes (5, all in shared group):**
1. Spaghetti Carbonara — pasta, main course (10 min prep, 20 min cook)
2. Avocado Toast — quick, vegetarian, breakfast (5 min prep, 5 min cook)
3. Chicken Stir Fry — main course, quick (10 min prep, 15 min cook)
4. Banana Pancakes — quick, breakfast, vegetarian (5 min prep, 10 min cook)
5. Classic Tomato Sauce — pasta, vegetarian (10 min prep, 40 min cook)

Each recipe includes 3–6 ingredients with amounts/units and 3–5 steps.

**Calendar Entries (4, in shared group):**
- 2026-02-23: Spaghetti Carbonara (linked recipe)
- 2026-02-24: "Leftovers" (free text)
- 2026-02-25: Chicken Stir Fry (linked recipe)
- 2026-02-26: "Pizza night" (free text)

### Seed SQL

See `supabase/seed.sql` for the complete idempotent seed script (a single `DO $$ ... $$` block using fixed UUIDs for all rows).

---

## 5. Implementation Phases

### Phase 1 — Database Foundation

Deliver: all migrations and seed data; working local Supabase instance.

- Write and apply the schema migration (`supabase/migrations/20260225000000_initial_schema.sql`).
- Implement RLS helper functions (`is_group_member`, `is_group_admin`).
- Write and apply all RLS policies (`supabase/migrations/20260225000001_rls_policies.sql`).
- Write `supabase/seed.sql`.
- Run `npx supabase gen types typescript --local > src/app/core/types/database.types.ts` and commit.
- Smoke-test: confirm trigger fires on user creation, RLS blocks cross-group queries.

### Phase 2 — App Shell and Navigation

Deliver: persistent navigation, group switcher, routing skeleton for all feature areas.

- Replace the placeholder `HomeComponent` with a proper shell layout: side navigation with routes to Recipes, Calendar, Groups.
- Create a `GroupService` (signal-based) that holds the list of groups the current user belongs to and the `activeGroupId` signal.
- Populate the group switcher in the nav from `GroupService`.
- Wire up lazy-loaded routes for `/recipes`, `/calendar`, `/groups`, `/invitations/:token`.
- Add a `groupGuard` that ensures an active group is selected before entering recipe/calendar routes.

### Phase 3 — Groups Feature

Deliver: full group management (create, invite, accept/decline, member list, remove member, rename).

- `GroupService`: methods for `createGroup`, `fetchMyGroups`, `fetchMembers`, `inviteMember`, `removeMember`, `renameGroup`.
- Group list page: shows all groups the user belongs to.
- Group settings page (admin only): rename, manage members, pending invitations, revoke invitations.
- Invite flow: email input form → service call → confirmation message.
- Invitation acceptance page (`/invitations/:token`): loads by token, prompts sign-in if not authenticated, then accepts/declines.

### Phase 4 — Recipe Management

Deliver: full CRUD for recipes including ingredients, steps, and tags.

- `RecipeService`: `listRecipes(groupId)`, `getRecipe(id)`, `createRecipe`, `updateRecipe`, `deleteRecipe`.
- `TagService`: `listTags(groupId)`, inline upsert on recipe save.
- `IngredientService`: `searchIngredients(groupId, query)` for autocomplete.
- `MeasurementService`: `listMeasurements()` (cached, read-only).
- Recipe list page: card grid with name, total time, servings, tags.
- Recipe detail page: full recipe view with servings scaler.
- Recipe form (shared for create/edit): ingredient reordering, step management, tag chip input.
- Confirm-delete dialog.

### Phase 5 — Search and Discovery

Deliver: full search and filter UI on the recipe list page.

- Search bar with 300 ms debounce, full-text search via `.textSearch('name', query)`.
- Tag multi-select filter chip group.
- Total time presets (≤15, ≤30, ≤45, ≤60 min, any).
- Source text filter.
- Ingredient name filter (AND semantics).
- All filters compose into a single Supabase query in `RecipeService.searchRecipes(groupId, filters)`.
- Clear-all-filters button; result count display.

### Phase 6 — Calendar

Deliver: full meal calendar with month/week views.

- `CalendarService`: `getEntries(groupId, from, to)`, `upsertEntry`, `deleteEntry`.
- Month view: grid of days, each showing entry name or free text.
- Week view: 7-column layout.
- Add/edit entry dialog: date picker, recipe typeahead or free-text toggle, notes field.
- Delete entry with confirmation.
- Navigation (previous/next month or week).
- Link from calendar entry to recipe detail.

### Phase 7 — Polish and Edge Cases

Deliver: production-quality UX, error handling, empty states, loading skeletons.

- Loading skeleton components for recipe cards and calendar cells.
- Empty state messages for: no recipes, no groups, no calendar entries, no search results.
- Global error handling.
- Reusable `ConfirmDialogService`.
- Mobile responsiveness audit (Capacitor target).

### Phase 8 🔮 — Future: URL Scraper

Deliver: recipe import via URL in the recipe creation form.

- Supabase Edge Function `scrape-recipe` accepts a URL, calls a scraping service, returns structured data.
- Angular service calls the edge function; prefills the recipe form.

### Phase 9 🔮 — Future: Photo Upload

Deliver: recipe photo management.

- Supabase Storage bucket `recipe-photos` with RLS (group members only).
- File picker in recipe form, upload on save, `photo_url` stored as the public URL.
- Thumbnail display on recipe cards.

---

## 6. Angular Feature Structure

```
src/app/
├── app.config.ts               (existing)
├── app.routes.ts               (existing — expand with feature routes)
├── app.ts                      (existing)
│
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts       (existing)
│   │   └── group.guard.ts      (NEW — ensures activeGroupId is set)
│   ├── services/
│   │   ├── auth.service.ts     (existing)
│   │   ├── supabase.service.ts (existing)
│   │   ├── group.service.ts    (NEW — active group signal, group CRUD)
│   │   ├── recipe.service.ts   (NEW)
│   │   ├── tag.service.ts      (NEW)
│   │   ├── ingredient.service.ts (NEW)
│   │   ├── measurement.service.ts (NEW — cached reference data)
│   │   └── calendar.service.ts (NEW)
│   ├── tokens/
│   │   └── environment.token.ts (existing)
│   └── types/
│       └── database.types.ts   (existing — regenerated after each migration)
│
├── features/
│   ├── auth/                   (existing — login, callback)
│   │
│   ├── shell/                  (NEW — app shell with nav, group switcher)
│   │   ├── shell.component.ts
│   │   ├── shell.component.html
│   │   ├── shell.component.css
│   │   └── nav/
│   │       └── nav.component.ts
│   │
│   ├── groups/                 (NEW)
│   │   ├── groups.routes.ts
│   │   ├── group-list/
│   │   │   └── group-list.component.ts
│   │   ├── group-settings/
│   │   │   ├── group-settings.component.ts
│   │   │   ├── member-list/
│   │   │   │   └── member-list.component.ts
│   │   │   └── invitation-list/
│   │   │       └── invitation-list.component.ts
│   │   ├── group-create/
│   │   │   └── group-create.component.ts
│   │   └── invitation-accept/
│   │       └── invitation-accept.component.ts
│   │
│   ├── recipes/                (NEW)
│   │   ├── recipes.routes.ts
│   │   ├── recipe-list/
│   │   │   ├── recipe-list.component.ts
│   │   │   ├── recipe-card/
│   │   │   │   └── recipe-card.component.ts
│   │   │   └── recipe-filter/
│   │   │       └── recipe-filter.component.ts
│   │   ├── recipe-detail/
│   │   │   ├── recipe-detail.component.ts
│   │   │   ├── ingredient-list/
│   │   │   │   └── ingredient-list.component.ts
│   │   │   └── step-list/
│   │   │       └── step-list.component.ts
│   │   └── recipe-form/        (shared create + edit)
│   │       ├── recipe-form.component.ts
│   │       ├── ingredient-row/
│   │       │   └── ingredient-row.component.ts
│   │       └── step-row/
│   │           └── step-row.component.ts
│   │
│   └── calendar/               (NEW)
│       ├── calendar.routes.ts
│       ├── calendar-view/
│       │   ├── calendar-view.component.ts
│       │   ├── month-grid/
│       │   │   ├── month-grid.component.ts
│       │   │   └── day-cell/
│       │   │       └── day-cell.component.ts
│       │   └── week-grid/
│       │       └── week-grid.component.ts
│       └── entry-dialog/
│           └── entry-dialog.component.ts
│
└── shared/                     (NEW — truly reusable, group-agnostic components)
    ├── components/
    │   ├── confirm-dialog/
    │   │   └── confirm-dialog.component.ts
    │   ├── loading-skeleton/
    │   │   └── loading-skeleton.component.ts
    │   └── empty-state/
    │       └── empty-state.component.ts
    └── pipes/
        └── scale-amount.pipe.ts   (scales ingredient amounts by servings ratio)
```

### Route Map

```
/                              → redirect to /recipes (with group guard)
/login                         → LoginComponent (existing)
/auth/callback                 → AuthCallbackComponent (existing)
/invitations/:token            → InvitationAcceptComponent (no group guard)

/groups                        → GroupListComponent
/groups/new                    → GroupCreateComponent
/groups/:groupId/settings      → GroupSettingsComponent

/recipes                       → RecipeListComponent  (group-scoped via GroupService)
/recipes/new                   → RecipeFormComponent
/recipes/:id                   → RecipeDetailComponent
/recipes/:id/edit              → RecipeFormComponent (edit mode)

/calendar                      → CalendarViewComponent (group-scoped)
```

### Service Pattern

Services follow the pattern established in `AuthService`:

```typescript
@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly groups  = inject(GroupService);

  private readonly _recipes = signal<Recipe[]>([]);
  readonly recipes = this._recipes.asReadonly();

  async loadRecipes(): Promise<void> {
    const groupId = this.groups.activeGroupId();
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*, recipe_tags(tag_id, tags(name))')
      .eq('group_id', groupId)
      .order('name');
    if (error) throw error;
    this._recipes.set(data);
  }
}
```

---

## Appendix: Migration File Naming

```
supabase/migrations/
  20260225000000_initial_schema.sql    ← Phase 1: all tables, triggers, functions
  20260225000001_rls_policies.sql      ← Phase 1: all RLS enable + policies
```

Split into two files to keep each migration focused and independently reviewable.

## Appendix: Regenerating Types

After every migration that changes the schema:

```bash
npx supabase gen types typescript --local > src/app/core/types/database.types.ts
```

Commit the updated `database.types.ts` alongside the migration file.
