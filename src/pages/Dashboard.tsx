import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useProfiles } from '@/hooks/useProfiles';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { Users, FolderKanban, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { data: tasks, isLoading } = useTasks();
  const { data: projects } = useProjects();
  const { data: profiles } = useProfiles();
  const navigate = useNavigate();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const allTasks = tasks || [];
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
  const done = allTasks.filter(t => t.status === 'done').length;

  const getProjectName = (id: string) => projects?.find(p => p.id === id)?.name ?? '';
  const getProfileName = (id: string | null) => profiles?.find(p => p.user_id === id)?.full_name ?? '';
  const getInitials = (id: string | null) => {
    const name = getProfileName(id);
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  };

  const stats = [
    { label: 'Total Tasks', value: allTasks.length, icon: FolderKanban, color: 'hsl(var(--primary))' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'hsl(217 91% 60%)' },
    { label: 'Completed', value: done, icon: CheckCircle2, color: 'hsl(142 71% 45%)' },
    { label: 'Projects', value: projects?.length || 0, icon: Users, color: 'hsl(263 70% 58%)' },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Team overview</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">All Tasks</h2>
          </div>
          <div className="grid grid-cols-[1fr_100px_100px_140px_100px_80px] gap-0 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span>Task</span>
            <span>Due</span>
            <span>Assignee</span>
            <span>Project</span>
            <span>Status</span>
            <span>Priority</span>
          </div>
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : allTasks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No tasks yet</div>
          ) : (
            allTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="grid grid-cols-[1fr_100px_100px_140px_100px_80px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{task.title}</p>
                <span className="text-xs text-muted-foreground flex items-center">{task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}</span>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold" title={getProfileName(task.owner_id)}>
                    {getInitials(task.owner_id)}
                  </div>
                </div>
                <span className="text-xs text-primary/80 flex items-center truncate cursor-pointer" onClick={e => { e.stopPropagation(); navigate(`/projects/${task.project_id}`); }}>
                  {getProjectName(task.project_id)}
                </span>
                <div className="flex items-center"><StatusBadge status={task.status} /></div>
                <div className="flex items-center"><PriorityBadge priority={task.priority} /></div>
              </div>
            ))
          )}
        </div>
      </div>

      <TaskDetailDrawer taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </AppLayout>
  );
}
