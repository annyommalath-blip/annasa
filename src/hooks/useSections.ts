import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectSection {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

export function useSections(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sections', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', projectId!)
        .order('position');
      if (error) throw error;
      return data as ProjectSection[];
    },
    enabled: !!projectId,
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ project_id, name, position }: { project_id: string; name: string; position: number }) => {
      const { data, error } = await supabase
        .from('project_sections')
        .insert({ project_id, name, position } as any)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectSection;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['sections', data.project_id] }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectSection> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_sections')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectSection;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['sections', data.project_id] }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from('project_sections').delete().eq('id', id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['sections', data.project_id] }),
  });
}
