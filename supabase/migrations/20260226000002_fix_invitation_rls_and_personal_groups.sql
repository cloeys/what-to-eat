-- ============================================================
-- Migration: 20260226000002_fix_invitation_rls_and_personal_groups.sql
-- 1. Fix group_invitations RLS policies: replace direct auth.users
--    subquery (permission denied for authenticated role) with auth.email(),
--    which reads from the JWT session without needing table access.
-- 2. Add is_personal flag to groups, populate it, and update handle_new_user.
-- ============================================================


-- ============================================================
-- PART 1 — Fix RLS policies that query auth.users directly
--
-- The authenticated role cannot SELECT from auth.users. Any RLS
-- policy that uses (SELECT email FROM auth.users WHERE id = auth.uid())
-- causes "permission denied for table users". Replace with auth.email()
-- which reads the email claim from the current JWT session.
-- ============================================================

-- Drop the old update policy (name may be truncated in pg, try both forms)
DROP POLICY IF EXISTS "group_invitations: admins can update (revoke) or invitee can respond"
  ON public.group_invitations;

DROP POLICY IF EXISTS "group_invitations: invitees can read their own"
  ON public.group_invitations;

-- Recreate UPDATE policy using auth.email()
CREATE POLICY "group_invitations: admins can update or invitee can respond"
  ON public.group_invitations FOR UPDATE
  TO authenticated
  USING (
    public.is_group_admin(group_id)
    OR lower(email) = lower(auth.email())
  )
  WITH CHECK (
    public.is_group_admin(group_id)
    OR lower(email) = lower(auth.email())
  );

-- Recreate SELECT policy for invitees using auth.email()
CREATE POLICY "group_invitations: invitees can read their own"
  ON public.group_invitations FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.email()));


-- ============================================================
-- PART 2 — is_personal flag on groups
-- ============================================================

-- Add the column (DEFAULT false for all existing rows)
ALTER TABLE public.groups
  ADD COLUMN is_personal boolean NOT NULL DEFAULT false;

-- Mark personal groups created by the handle_new_user trigger / backfill.
-- A personal group is one where the creator is the sole admin member
-- and the name matches the auto-generated pattern.
UPDATE public.groups g
SET is_personal = true
WHERE
  -- Creator is an admin member of the group
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = g.id
      AND gm.user_id = g.created_by
      AND gm.role = 'admin'
  )
  -- Group has exactly one member
  AND (SELECT COUNT(*) FROM public.group_members WHERE group_id = g.id) = 1
  -- Name matches the trigger/backfill pattern: "[display_name]'s Recipes"
  AND g.name = (
    SELECT
      COALESCE(p.display_name, SPLIT_PART(u.email, '@', 1)) || '''s Recipes'
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = g.created_by
  );

-- Update handle_new_user so new personal groups get is_personal = true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_group_id     uuid;
BEGIN
  v_display_name := COALESCE(
    new.raw_user_meta_data ->> 'full_name',
    SPLIT_PART(new.email, '@', 1)
  );

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    v_display_name,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  INSERT INTO public.groups (name, created_by, is_personal)
  VALUES (v_display_name || '''s Recipes', new.id, true)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, new.id, 'admin');

  RETURN new;
END;
$$;
