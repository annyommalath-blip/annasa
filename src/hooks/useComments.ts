import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskComment } from '@/types';

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at');
      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task_id, text }: { task_id: string; text: string }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({ task_id, text, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as TaskComment;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['comments', data.task_id] }),
  });
}
