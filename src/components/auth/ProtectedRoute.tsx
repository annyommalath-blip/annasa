import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams, useCreateTeam } from '@/hooks/useTeam';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const createTeam = useCreateTeam();
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    if (user && teams && teams.length === 0 && !createTeam.isPending && !setupDone) {
      // Auto-create a default team for new users
      createTeam.mutate('My Team', {
        onSuccess: () => setSetupDone(true),
      });
    } else if (teams && teams.length > 0) {
      setSetupDone(true);
    }
  }, [user, teams, createTeam.isPending, setupDone]);

  if (loading || teamsLoading || (user && !setupDone && teams?.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
