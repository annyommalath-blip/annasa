
-- Drop existing update policy
DROP POLICY "Team members can update tasks" ON public.tasks;

-- Recreate with collaborator access
CREATE POLICY "Team members or collaborators can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  is_project_member(auth.uid(), project_id)
  OR is_task_collaborator(id, auth.uid())
);
