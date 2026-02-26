-- ============================================================
-- Migration: 20260226000005_get_invitation_preview_rpc.sql
-- Adds get_invitation_preview(p_token) SECURITY DEFINER function
-- that returns the invitation data together with the group name
-- and inviter display name.
--
-- Running as SECURITY DEFINER avoids the RLS problem where an
-- invitee (not yet a group member) cannot read the groups table
-- through the normal member policy, causing the PostgREST join
-- and the direct fallback query to return null for the group name.
-- ============================================================

CREATE TYPE public.invitation_preview AS (
  id           uuid,
  token        text,
  group_id     uuid,
  group_name   text,
  email        text,
  invited_by   uuid,
  inviter_name text,
  status       public.invitation_status,
  expires_at   timestamptz,
  created_at   timestamptz
);

CREATE OR REPLACE FUNCTION public.get_invitation_preview(p_token text)
RETURNS public.invitation_preview
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.invitation_preview;
BEGIN
  SELECT
    gi.id,
    gi.token,
    gi.group_id,
    g.name,
    gi.email,
    gi.invited_by,
    COALESCE(p.display_name, gi.invited_by::text),
    gi.status,
    gi.expires_at,
    gi.created_at
  INTO v_result
  FROM public.group_invitations gi
  JOIN public.groups            g  ON g.id  = gi.group_id
  LEFT JOIN public.profiles     p  ON p.id  = gi.invited_by
  WHERE gi.token = p_token;

  RETURN v_result;  -- NULL if not found
END;
$$;

-- Callable by anyone (auth guard is in the component: redirect to login if not authenticated)
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(text) TO authenticated, anon;
