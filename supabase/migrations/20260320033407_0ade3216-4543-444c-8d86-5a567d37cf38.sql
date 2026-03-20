-- Ensure collaborators (mentioned users) can update tasks
DROP POLICY IF EXISTS "Team members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members or collaborators can update tasks" ON public.tasks;

CREATE POLICY "Team members or collaborators can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  is_project_member(auth.uid(), project_id)
  OR is_task_collaborator(id, auth.uid())
)
WITH CHECK (
  is_project_member(auth.uid(), project_id)
  OR is_task_collaborator(id, auth.uid())
);

-- Ensure @mentions actually add collaborators/notifications
DROP TRIGGER IF EXISTS trg_handle_comment_mentions ON public.task_comments;
CREATE TRIGGER trg_handle_comment_mentions
AFTER INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_comment_mentions();