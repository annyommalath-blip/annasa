
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.task_status AS ENUM ('draft', 'needs_review', 'approved', 'scheduled', 'posted', 'failed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.content_type AS ENUM ('reel', 'video', 'image', 'carousel', 'text');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Project members
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  platforms TEXT[] DEFAULT '{}',
  content_type content_type DEFAULT 'image',
  caption_master TEXT DEFAULT '',
  asset_urls TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewers UUID[] DEFAULT '{}',
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'draft',
  due_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  post_results JSONB DEFAULT '{}',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Task comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Automation logs
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'n8n',
  action TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- ===== HELPER FUNCTIONS (security definer to avoid RLS recursion) =====

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(team_id), '{}') FROM public.team_members WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- ===== TRIGGERS =====

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on tasks
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS POLICIES =====

-- Profiles: users can read all profiles (for displaying names), update own
CREATE POLICY "Anyone authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User roles: read own
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Teams: read if member, create for anyone, update/delete if admin
CREATE POLICY "Members can read their teams" ON public.teams FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_admin(auth.uid(), id));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE TO authenticated
  USING (public.is_team_admin(auth.uid(), id));

-- Team members: read if in same team, insert if admin (or creator adding self), update/delete if admin or self
CREATE POLICY "Team members can read members" ON public.team_members FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Users can join teams they create or admins can invite" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_team_admin(auth.uid(), team_id)
  );
CREATE POLICY "Admins or self can update membership" ON public.team_members FOR UPDATE TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id) OR user_id = auth.uid());
CREATE POLICY "Admins or self can delete membership" ON public.team_members FOR DELETE TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id) OR user_id = auth.uid());

-- Projects: scoped to team membership
CREATE POLICY "Team members can read projects" ON public.projects FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Team members can create projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid(), team_id) AND created_by = auth.uid());
CREATE POLICY "Team members can update projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id));

-- Project members: scoped to team membership
CREATE POLICY "Team members can read project members" ON public.project_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
CREATE POLICY "Team members can add project members" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
CREATE POLICY "Team members can remove project members" ON public.project_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_member(auth.uid(), p.team_id)
  ));

-- Tasks: scoped to project's team
CREATE POLICY "Team members can read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
CREATE POLICY "Team members can create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_member(auth.uid(), p.team_id)
  ) AND created_by = auth.uid());
CREATE POLICY "Team members can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
CREATE POLICY "Task owner or admin can delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_team_admin(auth.uid(), p.team_id)
    )
  );

-- Task comments: scoped to task's project's team
CREATE POLICY "Team members can read comments" ON public.task_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
CREATE POLICY "Team members can create comments" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Automation logs: readable by team members, writable only by service role
CREATE POLICY "Team members can read automation logs" ON public.automation_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_id AND public.is_team_member(auth.uid(), p.team_id)
  ));
-- No INSERT/UPDATE/DELETE policies for authenticated users — only service role can write

-- Enable realtime for tasks (for live kanban updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
