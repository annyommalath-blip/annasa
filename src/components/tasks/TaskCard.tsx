import { Task } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { PlatformIcon } from './PlatformIcon';
import { Calendar, MessageSquare, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
}

export function TaskCard({ task, onClick, compact }: TaskCardProps) {
  const { getUserById } = useApp();
  const owner = getUserById(task.ownerId);
  const completedChecklist = task.checklist.filter(c => c.completed).length;

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={task.platform} />
          <span className="text-xs text-muted-foreground capitalize">{task.contentType}</span>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {task.title}
      </h3>

      {!compact && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(task.dueDate), 'MMM d')}
          </div>
          {task.checklist.length > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {completedChecklist}/{task.checklist.length}
            </div>
          )}
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {!compact && <StatusBadge status={task.status} />}
        {owner && (
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold ml-auto" title={owner.name}>
            {owner.name.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>
    </div>
  );
}
