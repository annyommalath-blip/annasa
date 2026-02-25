import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTeams() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, profiles:user_id(id, user_id, full_name, avatar_url)')
        .eq('team_id', teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name, created_by: user!.id })
        .select()
        .single();
      if (teamError) throw teamError;

      // Add self as admin member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: user!.id, role: 'admin' as const });
      if (memberError) throw memberError;

      return team;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}
