export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'posted' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ContentType = 'reel' | 'video' | 'image' | 'carousel' | 'text';
export type Visibility = 'public' | 'private';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  content_type: ContentType | null;
  start_date: string | null;
  due_at: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  owner_id: string | null;
  created_by: string | null;
  project_id: string;
  visibility: Visibility;
  platforms: string[] | null;
  section_id: string | null;
  position: number;
  caption_master: string | null;
  asset_urls: string[] | null;
  error_message: string | null;
  post_results: any | null;
  reviewers: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface TaskCollaborator {
  id: string;
  task_id: string;
  user_id: string;
  added_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  task_id: string | null;
  read: boolean;
  created_at: string;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  invited_by: string;
  status: string;
  created_at: string;
}
