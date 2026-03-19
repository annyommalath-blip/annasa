-- Ensure project access is project-scoped (not team-scoped)
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.created_by = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = _project_id
      AND pm.user_id = _user_id
  );
$$;

-- Accept invitation should only grant project membership (not team-wide membership)
CREATE OR REPLACE FUNCTION public.accept_project_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invitation RECORD;
  _user_email text;
BEGIN
  SELECT email FROM auth.users WHERE id = auth.uid() INTO _user_email;

  SELECT * FROM public.project_invitations
  WHERE id = _invitation_id AND email = _user_email AND status = 'pending'
  INTO _invitation;

  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  -- Add only to project (project-scoped collaboration)
  INSERT INTO public.project_members (project_id, user_id)
  VALUES (_invitation.project_id, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.project_invitations SET status = 'accepted' WHERE id = _invitation_id;
END;
$function$;

-- Projects: visibility and edit scoped to project membership
DROP POLICY IF EXISTS "Team members can read projects" ON public.projects;
CREATE POLICY "Team members can read projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), id));

DROP POLICY IF EXISTS "Team members can update projects" ON public.projects;
CREATE POLICY "Team members can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.is_project_member(auth.uid(), id));

-- Project members table: scope by project membership
DROP POLICY IF EXISTS "Team members can read project members" ON public.project_members;
CREATE POLICY "Team members can read project members"
ON public.project_members
FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Team members can add project members" ON public.project_members;
CREATE POLICY "Team members can add project members"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Team members can remove project members" ON public.project_members;
CREATE POLICY "Team members can remove project members"
ON public.project_members
FOR DELETE
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Invitations: inviter must belong to that specific project
DROP POLICY IF EXISTS "Team members can create invitations" ON public.project_invitations;
CREATE POLICY "Team members can create invitations"
ON public.project_invitations
FOR INSERT
TO public
WITH CHECK (
  invited_by = auth.uid()
  AND public.is_project_member(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Team members can read invitations" ON public.project_invitations;
CREATE POLICY "Team members can read invitations"
ON public.project_invitations
FOR SELECT
TO public
USING (
  public.is_project_member(auth.uid(), project_id)
  OR email = public.get_current_user_email()
);

-- Project sections
DROP POLICY IF EXISTS "Team members can create sections" ON public.project_sections;
CREATE POLICY "Team members can create sections"
ON public.project_sections
FOR INSERT
TO public
WITH CHECK (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Team members can read sections" ON public.project_sections;
CREATE POLICY "Team members can read sections"
ON public.project_sections
FOR SELECT
TO public
USING (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Team members can update sections" ON public.project_sections;
CREATE POLICY "Team members can update sections"
ON public.project_sections
FOR UPDATE
TO public
USING (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Team members can delete sections" ON public.project_sections;
CREATE POLICY "Team members can delete sections"
ON public.project_sections
FOR DELETE
TO public
USING (public.is_project_member(auth.uid(), project_id));

-- Tasks
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
CREATE POLICY "Team members can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_project_member(auth.uid(), project_id)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Team members can update tasks" ON public.tasks;
CREATE POLICY "Team members can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Users can read tasks based on visibility" ON public.tasks;
CREATE POLICY "Users can read tasks based on visibility"
ON public.tasks
FOR SELECT
TO public
USING (
  public.is_project_member(auth.uid(), project_id)
  AND (
    visibility = 'public'
    OR created_by = auth.uid()
    OR owner_id = auth.uid()
    OR public.is_task_collaborator(id, auth.uid())
  )
);

-- Task comments
DROP POLICY IF EXISTS "Team members can create comments" ON public.task_comments;
CREATE POLICY "Team members can create comments"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can read comments" ON public.task_comments;
CREATE POLICY "Team members can read comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

-- Subtasks
DROP POLICY IF EXISTS "Team members can create subtasks" ON public.subtasks;
CREATE POLICY "Team members can create subtasks"
ON public.subtasks
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = subtasks.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can read subtasks" ON public.subtasks;
CREATE POLICY "Team members can read subtasks"
ON public.subtasks
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = subtasks.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can update subtasks" ON public.subtasks;
CREATE POLICY "Team members can update subtasks"
ON public.subtasks
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = subtasks.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can delete subtasks" ON public.subtasks;
CREATE POLICY "Team members can delete subtasks"
ON public.subtasks
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = subtasks.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

-- Task collaborators
DROP POLICY IF EXISTS "Team members can add collaborators" ON public.task_collaborators;
CREATE POLICY "Team members can add collaborators"
ON public.task_collaborators
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_collaborators.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can read collaborators" ON public.task_collaborators;
CREATE POLICY "Team members can read collaborators"
ON public.task_collaborators
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_collaborators.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can remove collaborators" ON public.task_collaborators;
CREATE POLICY "Team members can remove collaborators"
ON public.task_collaborators
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_collaborators.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

-- Attachments
DROP POLICY IF EXISTS "Team members can add attachments" ON public.attachments;
CREATE POLICY "Team members can add attachments"
ON public.attachments
FOR INSERT
TO public
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = attachments.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

DROP POLICY IF EXISTS "Team members can read attachments" ON public.attachments;
CREATE POLICY "Team members can read attachments"
ON public.attachments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = attachments.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);

-- Automation logs
DROP POLICY IF EXISTS "Team members can read automation logs" ON public.automation_logs;
CREATE POLICY "Team members can read automation logs"
ON public.automation_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = automation_logs.task_id
      AND public.is_project_member(auth.uid(), t.project_id)
  )
);