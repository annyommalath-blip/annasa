
-- Create a security definer function to check task collaboration without triggering RLS on tasks
CREATE OR REPLACE FUNCTION public.is_task_collaborator(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_collaborators
    WHERE task_id = _task_id AND user_id = _user_id
  );
$$;

-- Also create a function to check if user can access task via project team membership
CREATE OR REPLACE FUNCTION public.is_task_team_member(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = _task_id AND public.is_team_member(_user_id, p.team_id)
  );
$$;

-- Drop and recreate the tasks SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can read tasks based on visibility" ON public.tasks;

CREATE POLICY "Users can read tasks based on visibility"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id AND is_team_member(auth.uid(), p.team_id)
  )
  AND (
    visibility = 'public'
    OR created_by = auth.uid()
    OR owner_id = auth.uid()
    OR is_task_collaborator(tasks.id, auth.uid())
  )
);
