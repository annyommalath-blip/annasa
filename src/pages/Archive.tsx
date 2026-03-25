import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMyTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useProfiles } from '@/hooks/useProfiles';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { Task } from '@/types';
import { Archive as ArchiveIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Archive() {
  const { data: tasks, isLoading } = useMyTasks();
  const { data: projects } = useProjects();
  const { data: profiles } = useProfiles();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getProjectName = (id: string) => projects?.find(p => p.id === id)?.name ?? '';
  const getProfileName = (id: string | null) => profiles?.find(p => p.user_id === id)?.full_name ?? '';
  const getInitials = (id: string | null) => {
    const name = getProfileName(id);
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  };

  // Only show completed tasks
  let archivedTasks = (tasks || []).filter(t => t.status === 'done');

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    archivedTasks = archivedTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      getProjectName(t.project_id).toLowerCase().includes(q)
    );
  }

  // Sort by most recently completed (updated_at desc)
  archivedTasks = [...archivedTasks].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Archive</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {archivedTasks.length} completed task{archivedTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search archived tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_100px_140px_120px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span>Task Name</span>
            <span>Completed</span>
            <span>Assignee</span>
            <span>Project</span>
            <span>Due Date</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : archivedTasks.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ArchiveIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No archived tasks yet. Tasks marked as complete will appear here.</p>
            </div>
          ) : (
            archivedTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="grid grid-cols-[1fr_120px_100px_140px_120px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center min-w-0 gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground truncate line-through decoration-muted-foreground/40 group-hover:text-foreground transition-colors">
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(task.updated_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold" title={getProfileName(task.owner_id)}>
                    {getInitials(task.owner_id)}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground truncate">
                    {getProjectName(task.project_id)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TaskDetailDrawer taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </AppLayout>
  );
}
