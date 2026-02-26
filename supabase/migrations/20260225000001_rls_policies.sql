-- ============================================================
-- Migration: 20260225000001_rls_policies.sql
-- Enables RLS and defines all Row-Level Security policies.
-- Depends on: 20260225000000_initial_schema.sql
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.groups           enable row level security;
alter table public.group_members    enable row level security;
alter table public.group_invitations enable row level security;
alter table public.measurements     enable row level security;
alter table public.tags             enable row level security;
alter table public.ingredients      enable row level security;
alter table public.recipes          enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps     enable row level security;
alter table public.recipe_tags      enable row level security;
alter table public.calendar_entries enable row level security;


-- ============================================================
-- PROFILES
-- Any authenticated user can read profiles (needed for member
-- lists and invitation display). Users can only update their own.
-- ============================================================
create policy "profiles: authenticated users can read all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: users can update their own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- ============================================================
-- GROUPS
-- Only members can see a group. Any authenticated user can
-- create a group. Only admins can update.
-- ============================================================
create policy "groups: members can select"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

create policy "groups: authenticated users can create"
  on public.groups for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "groups: admins can update"
  on public.groups for update
  to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

create policy "groups: admins can delete"
  on public.groups for delete
  to authenticated
  using (public.is_group_admin(id));


-- ============================================================
-- GROUP MEMBERS
-- Members of the same group can see each other.
-- Only admins can insert/update/delete (except users removing
-- themselves, which is handled by application logic).
-- ============================================================
create policy "group_members: members can select same group"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "group_members: admins can insert"
  on public.group_members for insert
  to authenticated
  with check (public.is_group_admin(group_id));

create policy "group_members: admins can update roles"
  on public.group_members for update
  to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

create policy "group_members: admins can delete or users remove themselves"
  on public.group_members for delete
  to authenticated
  using (
    public.is_group_admin(group_id)
    or user_id = auth.uid()
  );


-- ============================================================
-- GROUP INVITATIONS
-- Admins can manage invitations for their group.
-- Anyone can read an invitation by token (for accept/decline link).
-- ============================================================
create policy "group_invitations: admins can select for their group"
  on public.group_invitations for select
  to authenticated
  using (public.is_group_admin(group_id));

-- Allow reading a single invitation by token without being a member
-- (the invitee may not be a member yet). Uses a separate anon policy.
create policy "group_invitations: anon can read by token"
  on public.group_invitations for select
  to anon
  using (true);

create policy "group_invitations: admins can insert"
  on public.group_invitations for insert
  to authenticated
  with check (
    public.is_group_admin(group_id)
    and invited_by = auth.uid()
  );

create policy "group_invitations: admins can update (revoke) or invitee can respond"
  on public.group_invitations for update
  to authenticated
  using (
    public.is_group_admin(group_id)
    or email = (select email from auth.users where id = auth.uid())
  )
  with check (
    public.is_group_admin(group_id)
    or email = (select email from auth.users where id = auth.uid())
  );

create policy "group_invitations: admins can delete"
  on public.group_invitations for delete
  to authenticated
  using (public.is_group_admin(group_id));


-- ============================================================
-- MEASUREMENTS
-- Global reference data. Any authenticated user can read.
-- No one can insert/update/delete (seeded only).
-- ============================================================
create policy "measurements: authenticated users can read"
  on public.measurements for select
  to authenticated
  using (true);


-- ============================================================
-- TAGS
-- Full CRUD for any member of the owning group.
-- ============================================================
create policy "tags: members can select"
  on public.tags for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "tags: members can insert"
  on public.tags for insert
  to authenticated
  with check (public.is_group_member(group_id));

create policy "tags: members can update"
  on public.tags for update
  to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "tags: members can delete"
  on public.tags for delete
  to authenticated
  using (public.is_group_member(group_id));


-- ============================================================
-- INGREDIENTS
-- Full CRUD for any member of the owning group.
-- ============================================================
create policy "ingredients: members can select"
  on public.ingredients for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "ingredients: members can insert"
  on public.ingredients for insert
  to authenticated
  with check (public.is_group_member(group_id));

create policy "ingredients: members can update"
  on public.ingredients for update
  to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "ingredients: members can delete"
  on public.ingredients for delete
  to authenticated
  using (public.is_group_member(group_id));


-- ============================================================
-- RECIPES
-- Full CRUD for any member of the owning group.
-- ============================================================
create policy "recipes: members can select"
  on public.recipes for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "recipes: members can insert"
  on public.recipes for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

create policy "recipes: members can update"
  on public.recipes for update
  to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "recipes: members can delete"
  on public.recipes for delete
  to authenticated
  using (public.is_group_member(group_id));


-- ============================================================
-- RECIPE INGREDIENTS
-- Access follows the owning recipe's group membership.
-- ============================================================
create policy "recipe_ingredients: members can select"
  on public.recipe_ingredients for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_ingredients: members can insert"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_ingredients: members can update"
  on public.recipe_ingredients for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_ingredients: members can delete"
  on public.recipe_ingredients for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );


-- ============================================================
-- RECIPE STEPS
-- Access follows the owning recipe's group membership.
-- ============================================================
create policy "recipe_steps: members can select"
  on public.recipe_steps for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_steps: members can insert"
  on public.recipe_steps for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_steps: members can update"
  on public.recipe_steps for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_steps: members can delete"
  on public.recipe_steps for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );


-- ============================================================
-- RECIPE TAGS
-- Access follows the owning recipe's group membership.
-- ============================================================
create policy "recipe_tags: members can select"
  on public.recipe_tags for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_tags: members can insert"
  on public.recipe_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );

create policy "recipe_tags: members can delete"
  on public.recipe_tags for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and public.is_group_member(r.group_id)
    )
  );


-- ============================================================
-- CALENDAR ENTRIES
-- Full CRUD for any member of the owning group.
-- ============================================================
create policy "calendar_entries: members can select"
  on public.calendar_entries for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "calendar_entries: members can insert"
  on public.calendar_entries for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and planned_by = auth.uid()
  );

create policy "calendar_entries: members can update"
  on public.calendar_entries for update
  to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "calendar_entries: members can delete"
  on public.calendar_entries for delete
  to authenticated
  using (public.is_group_member(group_id));
