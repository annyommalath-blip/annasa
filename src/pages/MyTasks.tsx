import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMyTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useProfiles } from '@/hooks/useProfiles';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { Task } from '@/types';
import { ListFilter, Globe, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MyTasks() {
  const { data: tasks, isLoading } = useMyTasks();
  const { data: projects } = useProjects();
  const { data: profiles } = useProfiles();
  const navigate = useNavigate();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created' | 'due'>('created');

  const getProjectName = (id: string) => projects?.find(p => p.id === id)?.name ?? '';
  const getProfileName = (id: string | null) => profiles?.find(p => p.user_id === id)?.full_name ?? '';
  const getInitials = (id: string | null) => {
    const name = getProfileName(id);
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  };

  let filteredTasks = tasks || [];
  if (statusFilter !== 'all') filteredTasks = filteredTasks.filter(t => t.status === statusFilter);

  // Sort: non-done tasks first (by due date asc), then done tasks at bottom (by due date asc)
  filteredTasks = [...filteredTasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    // Within same group, sort by due date (earliest first, no-date last)
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as 'created' | 'due')}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Newest</SelectItem>
                <SelectItem value="due">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_140px_80px_100px_80px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span>Task Name</span>
            <span>Due Date</span>
            <span>Assignee</span>
            <span>Project</span>
            <span className="text-center">Visibility</span>
            <span>Status</span>
            <span>Priority</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ListFilter className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No tasks yet. Click "Add Task" to create one.</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="grid grid-cols-[1fr_100px_100px_140px_80px_100px_80px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold" title={getProfileName(task.owner_id)}>
                    {getInitials(task.owner_id)}
                  </div>
                </div>
                <div className="flex items-center">
                  <span
                    className="text-xs text-primary/80 hover:text-primary cursor-pointer truncate"
                    onClick={e => { e.stopPropagation(); navigate(`/projects/${task.project_id}`); }}
                  >
                    {getProjectName(task.project_id)}
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  {task.visibility === 'public' ? (
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center">
                  <StatusBadge status={task.status} />
                </div>
                <div className="flex items-center">
                  <PriorityBadge priority={task.priority} />
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
