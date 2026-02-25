
-- Add visibility column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Add new status values to the enum
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'not_started';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'done';

-- Create subtasks table
CREATE TABLE public.subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read subtasks"
ON public.subtasks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = subtasks.task_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can create subtasks"
ON public.subtasks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = subtasks.task_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can update subtasks"
ON public.subtasks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = subtasks.task_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can delete subtasks"
ON public.subtasks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = subtasks.task_id AND is_team_member(auth.uid(), p.team_id)
));

-- Create task_collaborators table
CREATE TABLE public.task_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read collaborators"
ON public.task_collaborators FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = task_collaborators.task_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can add collaborators"
ON public.task_collaborators FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = task_collaborators.task_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can remove collaborators"
ON public.task_collaborators FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = task_collaborators.task_id AND is_team_member(auth.uid(), p.team_id)
));

-- Create attachments table
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read attachments"
ON public.attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = attachments.task_id AND is_team_member(auth.uid(), p.team_id)
));

CREATE POLICY "Team members can add attachments"
ON public.attachments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
  WHERE t.id = attachments.task_id AND is_team_member(auth.uid(), p.team_id)
) AND uploaded_by = auth.uid());

CREATE POLICY "Uploader can delete attachments"
ON public.attachments FOR DELETE
USING (uploaded_by = auth.uid());

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Uploaders can delete their attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update tasks RLS to handle visibility (private tasks)
-- Drop old SELECT policy and replace with visibility-aware one
DROP POLICY IF EXISTS "Team members can read tasks" ON public.tasks;

CREATE POLICY "Users can read tasks based on visibility"
ON public.tasks FOR SELECT
USING (
  -- Public tasks: any team member can see
  (visibility = 'public' AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND is_team_member(auth.uid(), p.team_id)
  ))
  OR
  -- Private tasks: only creator, assignee, or collaborator can see
  (visibility = 'private' AND (
    created_by = auth.uid()
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = tasks.id AND tc.user_id = auth.uid())
  ))
);
