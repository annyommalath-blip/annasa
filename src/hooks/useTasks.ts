import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task, TaskStatus, TaskPriority, ContentType, Visibility } from '@/types';

export function useTasks(projectId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tasks', user?.id, projectId],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export function useMyTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      // Get tasks where user is owner or creator
      const { data: ownedTasks, error: ownedErr } = await supabase
        .from('tasks')
        .select('*')
        .or(`owner_id.eq.${user!.id},created_by.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (ownedErr) throw ownedErr;

      // Get tasks where user is a collaborator (e.g. mentioned via @)
      const { data: collabRows, error: collabErr } = await supabase
        .from('task_collaborators')
        .select('task_id')
        .eq('user_id', user!.id);
      if (collabErr) throw collabErr;

      const ownedIds = new Set((ownedTasks || []).map(t => t.id));
      const collabTaskIds = (collabRows || [])
        .map(r => r.task_id)
        .filter(id => !ownedIds.has(id));

      let collabTasks: Task[] = [];
      if (collabTaskIds.length > 0) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('id', collabTaskIds)
          .order('created_at', { ascending: false });
        if (error) throw error;
        collabTasks = (data || []) as Task[];
      }

      return [...(ownedTasks as Task[]), ...collabTasks];
    },
    enabled: !!user,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Task;
    },
    enabled: !!id,
  });
}

interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  content_type?: ContentType;
  start_date?: string;
  due_at?: string;
  scheduled_at?: string;
  project_id: string;
  visibility?: Visibility;
  owner_id?: string;
}

export function useCreateTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...data,
          created_by: user!.id,
          owner_id: data.owner_id || user!.id,
          status: (data.status || 'not_started') as any,
          priority: (data.priority || 'medium') as any,
          content_type: (data.content_type || 'image') as any,
          visibility: data.visibility || 'public',
        })
        .select()
        .single();
      if (error) throw error;
      return task as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      qc.invalidateQueries({ queryKey: ['task', data.id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}
