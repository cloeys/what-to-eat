-- ============================================================
-- Migration: 20260226000003_leave_group_rpc.sql
-- Adds leave_group(p_group_id) RPC that:
--   1. Promotes the earliest-joined other member to admin if the
--      leaving user is the last admin and other members exist.
--   2. Deletes the caller's group_members row.
-- Handles admin promotion atomically so groups are never left
-- without an admin when other members remain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           uuid := auth.uid();
  v_role              public.group_role;
  v_other_admin_count int;
  v_next_member_id    uuid;
BEGIN
  -- Verify the caller is a member
  SELECT role INTO v_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  -- If the caller is an admin, ensure another admin will remain
  IF v_role = 'admin' THEN
    SELECT COUNT(*) INTO v_other_admin_count
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  != v_user_id
      AND role      = 'admin';

    IF v_other_admin_count = 0 THEN
      -- Promote the earliest-joined other member (if any)
      SELECT user_id INTO v_next_member_id
      FROM public.group_members
      WHERE group_id = p_group_id AND user_id != v_user_id
      ORDER BY joined_at
      LIMIT 1;

      IF FOUND THEN
        UPDATE public.group_members
        SET role = 'admin'
        WHERE group_id = p_group_id AND user_id = v_next_member_id;
      END IF;
      -- If no other member exists, user is sole member — just remove them
    END IF;
  END IF;

  -- Remove the caller from the group
  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.leave_group(uuid) TO authenticated;
