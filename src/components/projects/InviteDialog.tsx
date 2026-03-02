import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateInvitation, useProjectInvitations } from '@/hooks/useInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Mail, Check, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function InviteDialog({ open, onOpenChange, projectId }: InviteDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const createInvitation = useCreateInvitation();
  const { data: invitations } = useProjectInvitations(projectId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;

    if (email.trim() === user.email) {
      toast({ title: 'Cannot invite yourself', variant: 'destructive' });
      return;
    }

    const existing = invitations?.find(i => i.email === email.trim() && i.status === 'pending');
    if (existing) {
      toast({ title: 'Invitation already sent', variant: 'destructive' });
      return;
    }

    try {
      await createInvitation.mutateAsync({ projectId, email: email.trim(), invitedBy: user.id });
      toast({ title: 'Invitation sent!' });
      setEmail('');
    } catch (err: any) {
      toast({ title: 'Failed to send invitation', description: err.message, variant: 'destructive' });
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'accepted') return <Check className="w-3.5 h-3.5 text-green-500" />;
    if (status === 'declined') return <X className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInvite} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={createInvitation.isPending}>
            <Mail className="w-4 h-4 mr-2" /> Invite
          </Button>
        </form>

        {invitations && invitations.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Invitations</p>
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  {statusIcon(inv.status)}
                  <span className="text-foreground">{inv.email}</span>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{inv.status} · {format(new Date(inv.created_at), 'MMM d')}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
