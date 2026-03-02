import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProjectInvitations(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-invitations', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function usePendingInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-invitations', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*, projects(name)')
        .eq('email', user!.email!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, email, invitedBy }: { projectId: string; email: string; invitedBy: string }) => {
      const { data, error } = await supabase
        .from('project_invitations')
        .insert({ project_id: projectId, email, invited_by: invitedBy })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-invitations', vars.projectId] });
    },
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc('accept_project_invitation', { _invitation_id: invitationId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-invitations'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeclineInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('project_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-invitations'] });
    },
  });
}
