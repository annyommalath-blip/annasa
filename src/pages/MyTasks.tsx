import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { PlatformIcon } from '@/components/tasks/PlatformIcon';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Task } from '@/types';
import { Plus, MessageSquare, CheckSquare, ListFilter } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function MyTasks() {
  const { currentUser, tasks, projects, getUserById, setShowTaskForm } = useApp();
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const myTasks = tasks.filter(t => t.ownerId === currentUser.id);

  const getProjectName = (projectId: string) =>
    projects.find(p => p.id === projectId)?.name ?? '';

  return (
    <AppLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {myTasks.length} task{myTasks.length !== 1 ? 's' : ''} assigned to you
            </p>
          </div>
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Task list table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_120px_140px_140px_100px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Due date</span>
            <span>Platform</span>
            <span>Project</span>
            <span>Status</span>
            <span>Priority</span>
          </div>

          {myTasks.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ListFilter className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm mb-4">No tasks assigned to you yet</p>
              <Button variant="outline" onClick={() => setShowTaskForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first task
              </Button>
            </div>
          ) : (
            myTasks.map(task => (
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
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                  </span>
                </div>

                {/* Platform */}
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground capitalize">{task.platform}</span>
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
            ))
          )}
        </div>
      </div>

      <TaskModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </AppLayout>
  );
}
