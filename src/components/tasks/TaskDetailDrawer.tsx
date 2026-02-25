import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Globe, Lock, Plus, Trash2, Send, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useSubtasks, useCreateSubtask, useToggleSubtask } from '@/hooks/useSubtasks';
import { useComments, useCreateComment } from '@/hooks/useComments';
import { useProfiles } from '@/hooks/useProfiles';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TaskStatus, TaskPriority, Visibility } from '@/types';
import { toast } from '@/hooks/use-toast';

interface TaskDetailDrawerProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailDrawer({ taskId, open, onClose }: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const { data: task } = useTask(taskId || undefined);
  const { data: subtasks } = useSubtasks(taskId || undefined);
  const { data: comments } = useComments(taskId || undefined);
  const { data: profiles } = useProfiles();
  const { data: projects } = useProjects();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtask();
  const createComment = useCreateComment();

  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (task) setDescription(task.description || '');
  }, [task]);

  if (!task) return null;

  const getProfileName = (id: string | null) => profiles?.find(p => p.user_id === id)?.full_name ?? 'Unknown';
  const getInitials = (id: string | null) => {
    const name = getProfileName(id);
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };
  const projectName = projects?.find(p => p.id === task.project_id)?.name ?? '';

  const canEdit = task.created_by === user?.id || task.owner_id === user?.id;
  const canDelete = task.created_by === user?.id;

  const handleUpdate = (updates: Record<string, any>) => {
    updateTask.mutate({ id: task.id, ...updates } as any);
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id);
    onClose();
    toast({ title: 'Task deleted' });
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    createSubtask.mutate({ task_id: task.id, title: newSubtask.trim() });
    setNewSubtask('');
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ task_id: task.id, text: newComment.trim() });
    setNewComment('');
  };

  const saveDescription = () => {
    handleUpdate({ description });
    setEditingDescription(false);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        <div className="p-6">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">{task.title}</SheetTitle>
              {canDelete && (
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Meta fields */}
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground w-24">Status</span>
              {canEdit ? (
                <Select value={task.status} onValueChange={v => handleUpdate({ status: v })}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={task.status} />
              )}
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground w-24">Priority</span>
              {canEdit ? (
                <Select value={task.priority} onValueChange={v => handleUpdate({ priority: v })}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <PriorityBadge priority={task.priority} />
              )}
            </div>

            {/* Assignee */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground w-24">Assignee</span>
              {canEdit ? (
                <Select value={task.owner_id || ''} onValueChange={v => handleUpdate({ owner_id: v })}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {profiles?.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold">
                    {getInitials(task.owner_id)}
                  </div>
                  <span className="text-sm">{getProfileName(task.owner_id)}</span>
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground w-24">Due Date</span>
              {canEdit ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 w-40 text-xs justify-start", !task.due_at && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {task.due_at ? format(new Date(task.due_at), 'MMM d, yyyy') : 'Set date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={task.due_at ? new Date(task.due_at) : undefined}
                      onSelect={d => handleUpdate({ due_at: d?.toISOString() || null })}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <span className="text-sm">{task.due_at ? format(new Date(task.due_at), 'MMM d, yyyy') : '—'}</span>
              )}
            </div>

            {/* Project */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground w-24">Project</span>
              <span className="text-sm text-primary">{projectName}</span>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground w-24">Visibility</span>
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleUpdate({ visibility: task.visibility === 'public' ? 'private' : 'public' })}
                >
                  {task.visibility === 'public' ? (
                    <><Globe className="w-3.5 h-3.5" /> Public</>
                  ) : (
                    <><Lock className="w-3.5 h-3.5" /> Private</>
                  )}
                </Button>
              ) : (
                <span className="flex items-center gap-1.5 text-sm">
                  {task.visibility === 'public' ? <><Globe className="w-3.5 h-3.5" /> Public</> : <><Lock className="w-3.5 h-3.5" /> Private</>}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Description</h4>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDescription}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingDescription(false); setDescription(task.description || ''); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground min-h-[2rem]"
                onClick={() => canEdit && setEditingDescription(true)}
              >
                {task.description || (canEdit ? 'Click to add a description...' : 'No description')}
              </p>
            )}
          </div>

          {/* Subtasks */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">
              Subtasks {subtasks && subtasks.length > 0 && `(${subtasks.filter(s => s.completed).length}/${subtasks.length})`}
            </h4>
            <div className="space-y-2">
              {subtasks?.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={checked => toggleSubtask.mutate({ id: s.id, completed: !!checked, task_id: s.task_id })}
                  />
                  <span className={cn("text-sm", s.completed && "line-through text-muted-foreground")}>{s.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add subtask..."
                  className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-0"
                />
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Comments {comments && comments.length > 0 && `(${comments.length})`}</h4>
            <div className="space-y-3 mb-4">
              {comments?.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-[10px] font-semibold flex-shrink-0">
                    {getInitials(c.user_id)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{getProfileName(c.user_id)}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="h-9 text-sm"
              />
              <Button size="sm" variant="ghost" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
