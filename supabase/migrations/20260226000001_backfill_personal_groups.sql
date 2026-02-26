-- ============================================================
-- Migration: 20260226000001_backfill_personal_groups.sql
-- Creates profiles and personal groups for users who signed up
-- BEFORE the handle_new_user trigger was applied in the initial
-- schema migration. Safe to run multiple times (ON CONFLICT guards).
-- ============================================================

DO $$
DECLARE
  r      RECORD;
  v_name text;
  v_gid  uuid;
BEGIN
  FOR r IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.users.id
    )
  LOOP
    v_name := COALESCE(
      r.raw_user_meta_data ->> 'full_name',
      SPLIT_PART(r.email, '@', 1)
    );

    -- Create the missing profile
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
      r.id,
      v_name,
      r.raw_user_meta_data ->> 'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create the personal group
    INSERT INTO public.groups (name, created_by)
    VALUES (v_name || '''s Recipes', r.id)
    RETURNING id INTO v_gid;

    -- Add the user as admin of their personal group
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_gid, r.id, 'admin');
  END LOOP;
END;
$$;
