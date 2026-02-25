import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Subtask } from '@/types';

export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at');
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!taskId,
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, title }: { task_id: string; title: string }) => {
      const { data, error } = await supabase.from('subtasks').insert({ task_id, title }).select().single();
      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['subtasks', data.task_id] }),
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed, task_id }: { id: string; completed: boolean; task_id: string }) => {
      const { error } = await supabase.from('subtasks').update({ completed }).eq('id', id);
      if (error) throw error;
      return { task_id };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['subtasks', data.task_id] }),
  });
}
