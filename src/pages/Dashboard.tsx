import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { PlatformIcon } from '@/components/tasks/PlatformIcon';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Task } from '@/types';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, Users, MessageSquare, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { currentUser, team, projects, tasks, getUserById } = useApp();
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const needsReview = tasks.filter(t => t.status === 'needs-review').length;
  const posted = tasks.filter(t => t.status === 'posted').length;

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: FolderKanban, color: 'hsl(var(--primary))' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'hsl(217 91% 60%)' },
    { label: 'Needs Review', value: needsReview, icon: AlertTriangle, color: 'hsl(38 92% 50%)' },
    { label: 'Completed', value: posted, icon: CheckCircle2, color: 'hsl(142 71% 45%)' },
  ];

  const getProjectName = (projectId: string) =>
    projects.find(p => p.id === projectId)?.name ?? '';

  return (
    <AppLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Team Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {team.name} · All team activity
          </p>
        </div>

        {/* Stats */}
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

        {/* Team tasks table */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">All Team Tasks</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_140px_140px_100px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span>Due date</span>
              <span>Owner</span>
              <span>Project</span>
              <span>Status</span>
              <span>Priority</span>
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No tasks yet. Create one from the sidebar!
              </div>
            ) : (
              tasks.map(task => {
                const owner = getUserById(task.ownerId);
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="grid grid-cols-[1fr_120px_120px_140px_140px_100px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlatformIcon platform={task.platform} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{task.contentType}</span>
                          {task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments.length}
                            </span>
                          )}
                          {task.checklist.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <CheckSquare className="w-3 h-3" />
                              {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground">
                        {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                      </span>
                    </div>

                    <div className="flex items-center">
                      {owner ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold flex-shrink-0" title={owner.name}>
                            {owner.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{owner.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="flex items-center">
                      <span
                        className="text-xs text-primary/80 hover:text-primary cursor-pointer truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${task.projectId}`);
                        }}
                      >
                        {getProjectName(task.projectId)}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <StatusBadge status={task.status} />
                    </div>

                    <div className="flex items-center">
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Projects */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Projects</h2>
          <div className="grid grid-cols-2 gap-4">
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

      <TaskModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </AppLayout>
  );
}
