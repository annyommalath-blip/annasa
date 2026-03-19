import { AppLayout } from '@/components/layout/AppLayout';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { Bell, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Inbox() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notifications?.filter(n => !n.read).length || 0} unread notifications
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : !notifications?.length ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                  if (n.type === 'invitation') navigate('/dashboard');
                  else if (n.type === 'mention' && n.task_id) navigate('/my-tasks');
                  else if (n.task_id) navigate('/my-tasks');
                }}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={e => { e.stopPropagation(); markRead.mutate(n.id); }}
                    className="text-muted-foreground hover:text-foreground"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
