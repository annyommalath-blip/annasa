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
        .select('*')
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
      const { data, error } = await supabase.rpc('create_team_with_member', {
        _name: name,
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as string; // returns team id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}
