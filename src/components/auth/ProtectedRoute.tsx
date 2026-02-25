import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams, useCreateTeam } from '@/hooks/useTeam';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: teams, isLoading: teamsLoading, isError } = useTeams();
  const createTeam = useCreateTeam();
  const hasCreated = useRef(false);

  useEffect(() => {
    if (user && !teamsLoading && !isError && teams && teams.length === 0 && !createTeam.isPending && !hasCreated.current) {
      hasCreated.current = true;
      createTeam.mutate('My Team');
    }
  }, [user, teams, teamsLoading, isError, createTeam.isPending]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Wait for team setup
  if (teamsLoading || (teams?.length === 0 && !isError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
