import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Team, Project, Task, Notification, TaskStatus, Platform, ContentType, Priority } from '@/types';
import { mockUsers, mockTeam, mockProjects, mockNotifications } from '@/data/mockData';

interface NewTaskData {
  title: string;
  platform: Platform;
  contentType: ContentType;
  description: string;
  priority: Priority;
  dueDate: string;
  projectId: string;
}

interface AppContextType {
  currentUser: User;
  team: Team;
  projects: Project[];
  tasks: Task[];
  notifications: Notification[];
  showTaskForm: boolean;
  setShowTaskForm: (show: boolean) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  getProjectTasks: (projectId: string) => Task[];
  getTaskById: (taskId: string) => Task | undefined;
  getUserById: (userId: string) => User | undefined;
  markNotificationRead: (id: string) => void;
  addTask: (data: NewTaskData) => void;
  deleteTask: (taskId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser] = useState<User>(mockUsers[0]);
  const [team] = useState<Team>(mockTeam);
  const [projects] = useState<Project[]>(mockProjects);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const addTask = (data: NewTaskData) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: data.title,
      platform: data.platform,
      contentType: data.contentType,
      description: data.description,
      ownerId: currentUser.id,
      dueDate: data.dueDate,
      priority: data.priority,
      status: 'backlog',
      checklist: [],
      attachments: [],
      comments: [],
      projectId: data.projectId,
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const getProjectTasks = (projectId: string) => tasks.filter(t => t.projectId === projectId);
  const getTaskById = (taskId: string) => tasks.find(t => t.id === taskId);
  const getUserById = (userId: string) => team.members.find(u => u.id === userId);

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <AppContext.Provider value={{
      currentUser, team, projects, tasks, notifications,
      showTaskForm, setShowTaskForm,
      updateTaskStatus, getProjectTasks, getTaskById, getUserById,
      markNotificationRead, addTask, deleteTask,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
