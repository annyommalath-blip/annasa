import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { PlatformIcon } from '@/components/tasks/PlatformIcon';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Task } from '@/types';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, Users, User, MessageSquare, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'my-tasks' | 'team';

export default function Dashboard() {
  const { currentUser, team, projects, tasks, getUserById } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('my-tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const myTasks = tasks.filter(t => t.ownerId === currentUser.id);
  const teamTasks = tasks;

  const displayTasks = activeTab === 'my-tasks' ? myTasks : teamTasks;

  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const needsReview = tasks.filter(t => t.status === 'needs-review').length;
  const posted = tasks.filter(t => t.status === 'posted').length;

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: FolderKanban, color: 'hsl(var(--primary))' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'hsl(217 91% 60%)' },
    { label: 'Needs Review', value: needsReview, icon: AlertTriangle, color: 'hsl(38 92% 50%)' },
    { label: 'Completed', value: posted, icon: CheckCircle2, color: 'hsl(142 71% 45%)' },
  ];

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name ?? '';
  };

  return (
    <AppLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Good morning, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {team.name} · {format(new Date(2026, 1, 24), 'EEEE, MMMM d')}
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

        {/* Tabs */}
        <div className="border-b border-border mb-0">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab('my-tasks')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my-tasks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              My Tasks
              <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {myTasks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'team'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              Team
              <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {teamTasks.length}
              </span>
            </button>
          </div>
        </div>

        {/* Task list table (Asana-style) */}
        <div className="bg-card border border-border border-t-0 rounded-b-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_120px_140px_140px_100px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Due date</span>
            {activeTab === 'team' && <span>Owner</span>}
            {activeTab === 'my-tasks' && <span>Platform</span>}
            <span>Project</span>
            <span>Status</span>
            <span>Priority</span>
          </div>

          {/* Task rows */}
          {displayTasks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {activeTab === 'my-tasks'
                ? 'No tasks assigned to you yet'
                : 'No team tasks yet'}
            </div>
          ) : (
            displayTasks.map(task => {
              const owner = getUserById(task.ownerId);
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="grid grid-cols-[1fr_120px_120px_140px_140px_100px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  {/* Name */}
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

                  {/* Due date */}
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  </div>

                  {/* Owner (team view) or Platform (my tasks view) */}
                  <div className="flex items-center">
                    {activeTab === 'team' && owner ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold flex-shrink-0" title={owner.name}>
                          {owner.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{owner.name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{task.platform}</span>
                    )}
                  </div>

                  {/* Project */}
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

                  {/* Status */}
                  <div className="flex items-center">
                    <StatusBadge status={task.status} />
                  </div>

                  {/* Priority */}
                  <div className="flex items-center">
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TaskModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </AppLayout>
  );
}
