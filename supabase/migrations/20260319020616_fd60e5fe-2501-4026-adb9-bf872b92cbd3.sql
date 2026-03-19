
-- Create a SECURITY DEFINER function to get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Drop and recreate the problematic RLS policies on project_invitations
DROP POLICY IF EXISTS "Team members can read invitations" ON public.project_invitations;
CREATE POLICY "Team members can read invitations"
ON public.project_invitations
FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_invitations.project_id
    AND is_team_member(auth.uid(), p.team_id)
  ))
  OR (email = public.get_current_user_email())
);

DROP POLICY IF EXISTS "Invited user or inviter can update" ON public.project_invitations;
CREATE POLICY "Invited user or inviter can update"
ON public.project_invitations
FOR UPDATE
TO public
USING (
  (invited_by = auth.uid())
  OR (email = public.get_current_user_email())
);
