import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { PlatformIcon } from '@/components/tasks/PlatformIcon';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { currentUser, team, projects, tasks } = useApp();
  const navigate = useNavigate();

  const myTasks = tasks.filter(t => t.ownerId === currentUser.id);
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const needsReview = tasks.filter(t => t.status === 'needs-review').length;
  const posted = tasks.filter(t => t.status === 'posted').length;

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: FolderKanban, color: 'hsl(234 89% 64%)' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'hsl(217 91% 60%)' },
    { label: 'Needs Review', value: needsReview, icon: AlertTriangle, color: 'hsl(38 92% 50%)' },
    { label: 'Completed', value: posted, icon: CheckCircle2, color: 'hsl(142 71% 45%)' },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Good morning, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {team.name} · {format(new Date(2026, 1, 24), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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

        {/* My Tasks + Projects */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <h2 className="text-lg font-semibold mb-4">My Tasks</h2>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {myTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No tasks assigned to you</div>
              ) : (
                myTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                  >
                    <PlatformIcon platform={task.platform} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Projects</h2>
            <div className="space-y-3">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                  <div className="flex gap-1.5 mt-3">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
