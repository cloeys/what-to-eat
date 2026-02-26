-- ============================================================
-- Migration: 20260225000000_initial_schema.sql
-- Creates all tables, enums, indexes, triggers, and functions.
-- RLS enable/policies are in the next migration file.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- (pgcrypto is pre-installed in Supabase; gen_random_uuid is
--  built-in to PostgreSQL 13+ via the pgcrypto extension)
-- ============================================================


-- ============================================================
-- ENUMS
-- ============================================================
create type public.group_role as enum ('admin', 'member');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'expired');


-- ============================================================
-- PROFILES
-- Mirrors auth.users; one row per authenticated user.
-- Created automatically by the handle_new_user trigger.
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
  'A named collection of recipes and a calendar. One personal group is auto-created per user on signup.';


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
  token      text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status     public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

comment on table public.group_invitations is
  'Pending and historical invitations to join a group via email.';

-- Only one active pending invitation per group + email at a time
create unique index group_invitations_pending_unique
  on public.group_invitations (group_id, email)
  where (status = 'pending');


-- ============================================================
-- MEASUREMENTS (global reference table — seeded, not user-editable)
-- ============================================================
create table public.measurements (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  abbreviation text,
  sort_order   int not null default 0
);

comment on table public.measurements is
  'Global reference table of measurement units. Seeded at startup; not user-editable.';


-- ============================================================
-- TAGS (group-scoped, user-defined)
-- ============================================================
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

comment on table public.tags is
  'User-defined recipe tags, scoped to a group.';


-- ============================================================
-- INGREDIENTS (group-scoped name registry for autocomplete)
-- Note: recipe_ingredients.name is denormalised — this table
-- is only used to power the ingredient name autocomplete.
-- ============================================================
create table public.ingredients (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

comment on table public.ingredients is
  'Group-scoped ingredient name registry for autocomplete. '
  'A new row is upserted the first time a new ingredient name appears in a recipe.';


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
  source            text,
  photo_url         text,
  created_by        uuid not null references auth.users(id) on delete restrict,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.recipes is
  'Core recipe record. Ingredients, steps, and tags are in separate child tables.';

create index recipes_group_id_idx on public.recipes (group_id);
create index recipes_name_search_idx on public.recipes using gin (to_tsvector('english', name));


-- ============================================================
-- RECIPE INGREDIENTS
-- name is denormalised for fast display (not a FK to ingredients)
-- ============================================================
create table public.recipe_ingredients (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      uuid not null references public.recipes(id) on delete cascade,
  name           text not null,
  amount         numeric(10, 3),
  measurement_id uuid references public.measurements(id) on delete set null,
  notes          text,
  sort_order     int not null default 0
);

comment on table public.recipe_ingredients is
  'Ordered list of ingredients for a recipe. Name is denormalised; '
  'the ingredients table exists only for autocomplete.';

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
-- One entry per group per date. History is never deleted.
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
  unique (group_id, date),
  check (recipe_id is not null or (free_text is not null and free_text <> ''))
);

comment on table public.calendar_entries is
  'Meal plan entries for a group. One entry per group per date. History is never deleted.';

create index calendar_entries_group_date_idx on public.calendar_entries (group_id, date desc);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create trigger trg_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create trigger trg_calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute function public.set_updated_at();


-- ============================================================
-- AUTO-CREATE PROFILE + PERSONAL GROUP ON SIGNUP
-- Fires after a new row is inserted into auth.users.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_group_id     uuid;
begin
  -- Derive display name: prefer Google full_name, fall back to email prefix
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.groups (name, created_by)
  values (v_display_name || '''s Recipes', new.id)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, new.id, 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- RLS HELPER FUNCTIONS
-- Used inside RLS policies to avoid repetition.
-- ============================================================
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'admin'
  );
$$;
