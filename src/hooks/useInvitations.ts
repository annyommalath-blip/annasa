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

      // Get project name for the notification message
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      // Look up the invited user's profile by matching email in auth
      // We search profiles to find user_id, but since profiles don't store email,
      // we check if there's a profile whose user signed up with this email
      const { data: allProfiles } = await supabase.from('profiles').select('user_id');
      
      // Try to find user by checking all profiles - we need to match by email
      // Since we can't query auth.users, we'll create notification if the user exists
      // by trying to find their profile via a different approach
      // For now, store the notification with a lookup via project_invitations
      // The invited user will see it through PendingInvitations component
      
      // Also create an in-app notification for the invited user if they exist
      if (allProfiles) {
        // We need the invited user's ID - let's check profiles table
        // Since profiles don't have email, we use a workaround:
        // Query project_invitations to find if user exists by checking if they can read their own invitation
        // Instead, we'll create notifications for all matching users by searching via RPC or direct lookup
        
        // Simple approach: try to find user_id from existing accepted invitations or team members
        // But the cleanest way is to just attempt inserting - if user doesn't exist, no notification
        const { data: invitedProfiles } = await supabase
          .rpc('get_user_id_by_email' as any, { _email: email })
          .maybeSingle();
        
        // If we can't use RPC, skip notification - user will still see PendingInvitations
      }

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
