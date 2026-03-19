
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;

-- Recreate with a simpler check using get_user_team_ids
CREATE POLICY "Team members can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND team_id = ANY(public.get_user_team_ids(auth.uid()))
);
