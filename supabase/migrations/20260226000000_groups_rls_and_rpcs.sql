-- ============================================================
-- Migration: 20260226000000_groups_rls_and_rpcs.sql
-- Fixes group_invitations SELECT policy for invitees and adds
-- security-definer RPC functions for atomic group operations.
-- ============================================================


-- ============================================================
-- FIX: group_invitations — allow invitees to read their own invitations
-- The original policy only allowed admins to select invitations.
-- Invitees need to read the invitation (by token) before they can accept it.
-- ============================================================
create policy "group_invitations: invitees can read their own"
  on public.group_invitations for select
  to authenticated
  using (
    email = (select email from auth.users where id = auth.uid())
  );


-- ============================================================
-- RPC: create_group
-- Creates a new group and adds the caller as admin in a single
-- atomic operation (bypasses the chicken-and-egg RLS problem
-- where the creator cannot insert a group_members row before
-- the group exists and they are already an admin).
-- ============================================================
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if char_length(trim(p_name)) = 0 then
    raise exception 'Group name cannot be empty';
  end if;

  insert into public.groups (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'admin');

  return v_group_id;
end;
$$;


-- ============================================================
-- RPC: accept_invitation
-- Validates a pending invitation by token, confirms it belongs
-- to the calling user's email, marks it accepted, and inserts
-- the group membership row — all atomically.
-- ============================================================
create or replace function public.accept_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv group_invitations%rowtype;
  v_user_email text;
begin
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  select * into v_inv
  from group_invitations
  where token = p_token;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Invitation has already been % ', v_inv.status;
  end if;

  if v_inv.expires_at < now() then
    update group_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Invitation has expired';
  end if;

  if lower(v_inv.email) <> lower(v_user_email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  update group_invitations
  set status = 'accepted'
  where id = v_inv.id;

  insert into group_members (group_id, user_id, role)
  values (v_inv.group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
end;
$$;


-- ============================================================
-- RPC: decline_invitation
-- Validates a pending invitation and marks it declined.
-- ============================================================
create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv group_invitations%rowtype;
  v_user_email text;
begin
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  select * into v_inv
  from group_invitations
  where token = p_token;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Invitation has already been % ', v_inv.status;
  end if;

  if v_inv.expires_at < now() then
    update group_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Invitation has expired';
  end if;

  if lower(v_inv.email) <> lower(v_user_email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  update group_invitations
  set status = 'declined'
  where id = v_inv.id;
end;
$$;
