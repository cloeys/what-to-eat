-- ============================================================
-- Migration: 20260226000004_groups_rls_invitee_can_read.sql
-- Allow authenticated users to read the name/details of a group
-- they have been invited to (status = 'pending'). Without this,
-- the groups join in fetchInvitationByToken returns null because
-- the invitee is not yet a member and the existing SELECT policy
-- only covers group members.
-- ============================================================

CREATE POLICY "groups: invitees can view groups they are invited to"
  ON public.groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_invitations gi
      WHERE gi.group_id = id
        AND lower(gi.email) = lower(auth.email())
        AND gi.status = 'pending'
    )
  );
