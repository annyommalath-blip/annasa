import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Task, TaskStatus } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { PriorityBadge } from './PriorityBadge';
import { PlatformIcon } from './PlatformIcon';
import { Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskModal({ task, open, onClose }: TaskModalProps) {
  const { getUserById, updateTaskStatus } = useApp();

  if (!task) return null;

  const owner = getUserById(task.ownerId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <PlatformIcon platform={task.platform} />
            <span className="text-xs text-muted-foreground capitalize">{task.contentType}</span>
          </div>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v as TaskStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="needs-review">Needs Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <div className="pt-1"><PriorityBadge priority={task.priority} /></div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Due Date</label>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Owner</label>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold">
                {owner?.name.split(' ').map(n => n[0]).join('')}
              </div>
              {owner?.name}
            </div>
          </div>
        </div>

        {task.description && (
          <div className="py-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
        )}

        {task.checklist.length > 0 && (
          <div className="py-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Checklist ({task.checklist.filter(c => c.completed).length}/{task.checklist.length})
            </h4>
            <div className="space-y-2">
              {task.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox checked={item.completed} />
                  <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {task.comments.length > 0 && (
          <div className="py-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({task.comments.length})
            </h4>
            <div className="space-y-3">
              {task.comments.map(comment => {
                const commenter = getUserById(comment.userId);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-[10px] font-semibold flex-shrink-0">
                      {commenter?.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{commenter?.name}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
