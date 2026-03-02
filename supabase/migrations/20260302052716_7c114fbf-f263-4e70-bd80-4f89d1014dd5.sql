
CREATE TABLE public.project_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Team members of the project can read invitations
CREATE POLICY "Team members can read invitations"
  ON public.project_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_invitations.project_id
      AND is_team_member(auth.uid(), p.team_id)
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Team members can create invitations
CREATE POLICY "Team members can create invitations"
  ON public.project_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_invitations.project_id
      AND is_team_member(auth.uid(), p.team_id)
    )
  );

-- Invited user or inviter can update (accept/decline)
CREATE POLICY "Invited user or inviter can update"
  ON public.project_invitations FOR UPDATE
  USING (
    invited_by = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Inviter can delete invitations
CREATE POLICY "Inviter can delete invitations"
  ON public.project_invitations FOR DELETE
  USING (invited_by = auth.uid());

-- Function to accept invitation: adds user to team + project_members
CREATE OR REPLACE FUNCTION public.accept_project_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invitation RECORD;
  _user_email text;
  _team_id uuid;
BEGIN
  SELECT email FROM auth.users WHERE id = auth.uid() INTO _user_email;
  
  SELECT * FROM public.project_invitations
  WHERE id = _invitation_id AND email = _user_email AND status = 'pending'
  INTO _invitation;
  
  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  SELECT team_id FROM public.projects WHERE id = _invitation.project_id INTO _team_id;
  
  -- Add to team if not already a member
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (_team_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  
  -- Add to project_members if not already
  INSERT INTO public.project_members (project_id, user_id)
  VALUES (_invitation.project_id, auth.uid())
  ON CONFLICT DO NOTHING;
  
  -- Mark invitation as accepted
  UPDATE public.project_invitations SET status = 'accepted' WHERE id = _invitation_id;
END;
$$;
