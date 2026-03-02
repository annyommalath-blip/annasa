import { usePendingInvitations, useAcceptInvitation, useDeclineInvitation } from '@/hooks/useInvitations';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Mail, Check, X } from 'lucide-react';

export function PendingInvitations() {
  const { data: invitations } = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  if (!invitations || invitations.length === 0) return null;

  const handleAccept = async (id: string) => {
    try {
      await acceptInvitation.mutateAsync(id);
      toast({ title: 'Invitation accepted! You now have access to the project.' });
    } catch (err: any) {
      toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' });
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineInvitation.mutateAsync(id);
      toast({ title: 'Invitation declined' });
    } catch (err: any) {
      toast({ title: 'Failed to decline', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-2 mb-6">
      {invitations.map((inv: any) => (
        <div key={inv.id} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                You've been invited to join <span className="text-primary">{inv.projects?.name || 'a project'}</span>
              </p>
              <p className="text-xs text-muted-foreground">Click accept to get access</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleDecline(inv.id)} disabled={declineInvitation.isPending}>
              <X className="w-3.5 h-3.5 mr-1" /> Decline
            </Button>
            <Button size="sm" onClick={() => handleAccept(inv.id)} disabled={acceptInvitation.isPending}>
              <Check className="w-3.5 h-3.5 mr-1" /> Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
