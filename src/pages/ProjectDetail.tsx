import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { Plus, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(id);
  const { data: profiles } = useProfiles();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const getProfileName = (uid: string | null) => profiles?.find(p => p.user_id === uid)?.full_name ?? '';
  const getInitials = (uid: string | null) => {
    const name = getProfileName(uid);
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  };

  if (projectLoading) return <AppLayout><div className="text-muted-foreground">Loading...</div></AppLayout>;
  if (!project) return <AppLayout><div className="text-muted-foreground">Project not found</div></AppLayout>;

  const projectTasks = tasks || [];

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="mb-6">
          <button onClick={() => navigate('/projects')} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">← Projects</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_80px_100px_80px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span>Task</span>
            <span>Assignee</span>
            <span>Due Date</span>
            <span className="text-center">Visibility</span>
            <span>Status</span>
            <span>Priority</span>
          </div>

          {tasksLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : projectTasks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No tasks yet. Click "Add Task" to create one.
            </div>
          ) : (
            projectTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="grid grid-cols-[1fr_100px_100px_80px_100px_80px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{task.title}</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold" title={getProfileName(task.owner_id)}>
                    {getInitials(task.owner_id)}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{getProfileName(task.owner_id).split(' ')[0]}</span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center">{task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}</span>
                <div className="flex items-center justify-center">
                  {task.visibility === 'public' ? <Globe className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex items-center"><StatusBadge status={task.status} /></div>
                <div className="flex items-center"><PriorityBadge priority={task.priority} /></div>
              </div>
            ))
          )}
        </div>
      </div>

      <TaskDetailDrawer taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <CreateTaskDialog open={showCreate} onOpenChange={setShowCreate} defaultProjectId={id} />
    </AppLayout>
  );
}
