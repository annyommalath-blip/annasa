import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskModal } from '@/components/tasks/TaskModal';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { PlatformIcon } from '@/components/tasks/PlatformIcon';
import { Task } from '@/types';
import { Kanban, List, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ViewMode = 'board' | 'list' | 'calendar';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { projects, getProjectTasks, getUserById } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const project = projects.find(p => p.id === id);
  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Project not found</div>
      </AppLayout>
    );
  }

  let projectTasks = getProjectTasks(project.id);
  if (filterPlatform !== 'all') projectTasks = projectTasks.filter(t => t.platform === filterPlatform);
  if (filterPriority !== 'all') projectTasks = projectTasks.filter(t => t.priority === filterPriority);

  const views: { mode: ViewMode; icon: typeof Kanban; label: string }[] = [
    { mode: 'board', icon: Kanban, label: 'Board' },
    { mode: 'list', icon: List, label: 'List' },
    { mode: 'calendar', icon: Calendar, label: 'Calendar' },
  ];

  return (
    <AppLayout>
      <div>
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 block transition-colors"
          >
            ← Projects
          </button>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>

        {/* View toggle + filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex bg-muted rounded-lg p-1">
            {views.map(v => (
              <button
                key={v.mode}
                onClick={() => setView(v.mode)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === v.mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <v.icon className="w-4 h-4" />
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content views */}
        {view === 'board' && (
          <KanbanBoard tasks={projectTasks} onTaskClick={setSelectedTask} />
        )}

        {view === 'list' && (
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {projectTasks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">No tasks match your filters</div>
            ) : (
              projectTasks.map(task => {
                const owner = getUserById(task.ownerId);
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <PlatformIcon platform={task.platform} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {task.contentType} · {format(new Date(task.dueDate), 'MMM d')}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    {owner && (
                      <div
                        className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold"
                        title={owner.name}
                      >
                        {owner.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {view === 'calendar' && (
          <CalendarGrid tasks={projectTasks} onTaskClick={setSelectedTask} />
        )}

        <TaskModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      </div>
    </AppLayout>
  );
}
