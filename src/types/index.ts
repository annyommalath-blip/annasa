export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
export type ContentType = 'reel' | 'post' | 'story';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'backlog' | 'in-progress' | 'needs-review' | 'approved' | 'scheduled' | 'posted';
export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
}

export interface Team {
  id: string;
  name: string;
  members: User[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  memberIds: string[];
  teamId: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  platform: Platform;
  contentType: ContentType;
  description: string;
  ownerId: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  checklist: ChecklistItem[];
  attachments: string[];
  comments: Comment[];
  projectId: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
}
