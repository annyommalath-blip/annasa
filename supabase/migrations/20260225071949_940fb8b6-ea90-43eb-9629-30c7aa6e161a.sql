
-- Project sections (headers like "January work")
CREATE TABLE public.project_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read sections"
ON public.project_sections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_sections.project_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can create sections"
ON public.project_sections FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_sections.project_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can update sections"
ON public.project_sections FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_sections.project_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can delete sections"
ON public.project_sections FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_sections.project_id AND is_team_member(auth.uid(), p.team_id)
));

-- Add section_id and position to tasks for ordering
ALTER TABLE public.tasks
  ADD COLUMN section_id uuid REFERENCES public.project_sections(id) ON DELETE SET NULL,
  ADD COLUMN position integer NOT NULL DEFAULT 0;
