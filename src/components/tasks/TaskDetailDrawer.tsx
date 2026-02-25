import { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon, Globe, Lock, Plus, Trash2, Send, Check,
  X, Maximize2, MoreHorizontal, ArrowRightToLine, Paperclip,
  User
} from 'lucide-react';
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
import { TaskStatus, TaskPriority } from '@/types';
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

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  const getProfileName = (id: string | null) => profiles?.find(p => p.user_id === id)?.full_name ?? 'Unknown';
  const getInitials = (id: string | null) => {
    const name = getProfileName(id);
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  const projectName = projects?.find(p => p.id === task?.project_id)?.name ?? '';

  if (!task) return null;

  const canEdit = task.created_by === user?.id || task.owner_id === user?.id;

  const handleUpdate = (updates: Record<string, any>) => {
    updateTask.mutate({ id: task.id, ...updates } as any);
  };

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) handleUpdate({ title: title.trim() });
    setEditingTitle(false);
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

  const saveDescription = () => {
    handleUpdate({ description });
    setEditingDescription(false);
  };

  // @mention logic
  const mentionProfiles = profiles?.filter(p =>
    mentionSearch !== null && p.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  ) || [];

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length < 30) {
        setMentionSearch(afterAt);
        setMentionIndex(0);
        return;
      }
    }
    setMentionSearch(null);
  };

  const insertMention = (profileName: string) => {
    const lastAt = newComment.lastIndexOf('@');
    const before = newComment.slice(0, lastAt);
    setNewComment(`${before}@${profileName} `);
    setMentionSearch(null);
    commentRef.current?.focus();
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (mentionSearch !== null && mentionProfiles.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionProfiles.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionProfiles[mentionIndex].full_name); return; }
      if (e.key === 'Escape') { setMentionSearch(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionSearch === null) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ task_id: task.id, text: newComment.trim() });
    setNewComment('');
    setMentionSearch(null);
  };

  const completedSubtasks = subtasks?.filter(s => s.completed).length ?? 0;
  const totalSubtasks = subtasks?.length ?? 0;

  const isComplete = task.status === 'done';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <Button
            variant={isComplete ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs font-medium rounded-md",
              isComplete && "bg-green-600 hover:bg-green-700 text-white"
            )}
            onClick={() => handleUpdate({ status: isComplete ? 'not_started' : 'done' })}
          >
            <Check className="w-3.5 h-3.5" />
            {isComplete ? 'Completed' : 'Mark complete'}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
              <ArrowRightToLine className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Visibility banner */}
        {task.visibility === 'private' && (
          <div className="flex items-center justify-between px-5 py-2 bg-muted/60 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span>This task is private to you.</span>
            </div>
            {canEdit && (
              <button
                className="text-xs text-primary hover:underline font-medium"
                onClick={() => handleUpdate({ visibility: 'public' })}
              >
                Make public
              </button>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-6 pb-4">
            {/* Title */}
            {editingTitle ? (
              <Input
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-0 bg-transparent"
              />
            ) : (
              <h2
                className="text-xl font-bold text-foreground cursor-text hover:text-foreground/80 transition-colors"
                onClick={() => canEdit && setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}

            {/* Meta fields */}
            <div className="mt-5 space-y-3.5">
              {/* Assignee */}
              <MetaRow label="Assignee">
                {canEdit ? (
                  <Select value={task.owner_id || ''} onValueChange={v => handleUpdate({ owner_id: v })}>
                    <SelectTrigger className="h-8 w-52 text-sm border-none shadow-none bg-transparent hover:bg-muted/50 -ml-2 px-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
                            {getInitials(task.owner_id)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{getProfileName(task.owner_id)}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {profiles?.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          <span className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
                                {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {p.full_name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
                        {getInitials(task.owner_id)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{getProfileName(task.owner_id)}</span>
                  </div>
                )}
              </MetaRow>

              {/* Due Date */}
              <MetaRow label="Due date">
                {canEdit ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex items-center gap-2 text-sm h-8 px-2 -ml-2 rounded-md hover:bg-muted/50 transition-colors",
                        !task.due_at && "text-muted-foreground"
                      )}>
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        {task.due_at ? format(new Date(task.due_at), 'MMM d, yyyy') : 'No due date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={task.due_at ? new Date(task.due_at) : undefined}
                        onSelect={d => handleUpdate({ due_at: d?.toISOString() || null })}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="text-sm">{task.due_at ? format(new Date(task.due_at), 'MMM d, yyyy') : 'No due date'}</span>
                )}
              </MetaRow>

              {/* Priority */}
              <MetaRow label="Priority">
                {canEdit ? (
                  <Select value={task.priority} onValueChange={v => handleUpdate({ priority: v })}>
                    <SelectTrigger className="h-8 w-32 text-sm border-none shadow-none bg-transparent hover:bg-muted/50 -ml-2 px-2">
                      <PriorityBadge priority={task.priority} />
                    </SelectTrigger>
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
              </MetaRow>

              {/* Status */}
              <MetaRow label="Status">
                {canEdit ? (
                  <Select value={task.status} onValueChange={v => handleUpdate({ status: v })}>
                    <SelectTrigger className="h-8 w-36 text-sm border-none shadow-none bg-transparent hover:bg-muted/50 -ml-2 px-2">
                      <StatusBadge status={task.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={task.status} />
                )}
              </MetaRow>

              {/* Project */}
              <MetaRow label="Project">
                <span className="text-sm text-primary font-medium">{projectName}</span>
              </MetaRow>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  className="text-sm resize-none"
                  placeholder="What is this task about?"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveDescription}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingDescription(false); setDescription(task.description || ''); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  "text-sm min-h-[3rem] whitespace-pre-wrap",
                  task.description ? "text-foreground/80" : "text-muted-foreground italic",
                  canEdit && "cursor-text hover:bg-muted/30 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                )}
                onClick={() => canEdit && setEditingDescription(true)}
              >
                {task.description || 'What is this task about?'}
              </p>
            )}
          </div>

          <Separator />

          {/* Subtasks */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground">Subtasks</h3>
              {totalSubtasks > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}
              <button
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowSubtaskInput(true)}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {subtasks?.map(s => (
                <div key={s.id} className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 transition-colors">
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={checked => toggleSubtask.mutate({ id: s.id, completed: !!checked, task_id: s.task_id })}
                    className="h-4 w-4"
                  />
                  <span className={cn("text-sm flex-1", s.completed && "line-through text-muted-foreground")}>{s.title}</span>
                </div>
              ))}
              {showSubtaskInput && (
                <div className="flex items-center gap-2 py-1">
                  <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddSubtask();
                      if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtask(''); }
                    }}
                    onBlur={() => { if (!newSubtask.trim()) setShowSubtaskInput(false); }}
                    placeholder="Add subtask..."
                    className="h-7 text-sm border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Attachments placeholder */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">0</span>
              <button className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Separator />

          {/* Comments section */}
          <div className="px-6 py-5">
            <div className="space-y-4">
              {comments?.map(c => {
                // Parse @mentions in comment text
                const parts = c.text.split(/(@\w[\w\s]*?\b)/g);
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground font-semibold">
                        {getInitials(c.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{getProfileName(c.user_id)}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">
                        {parts.map((part, i) =>
                          part.startsWith('@') ? (
                            <span key={i} className="text-primary font-medium">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky comment bar at bottom */}
        <div className="border-t border-border bg-card px-5 py-3">
          <div className="flex gap-3 items-start relative">
            <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
              <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
                {user ? getInitials(user.id) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              {/* Mention dropdown */}
              {mentionSearch !== null && mentionProfiles.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 max-h-40 overflow-y-auto">
                  {mentionProfiles.slice(0, 6).map((p, i) => (
                    <button
                      key={p.user_id}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left",
                        i === mentionIndex && "bg-muted"
                      )}
                      onMouseDown={e => { e.preventDefault(); insertMention(p.full_name); }}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
                          {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{p.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                ref={commentRef}
                value={newComment}
                onChange={e => handleCommentChange(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                placeholder="Add a comment... (type @ to mention)"
                rows={2}
                className="text-sm resize-none pr-10 min-h-[2.5rem]"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 bottom-1 h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Collaborators bar */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Collaborators</span>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-primary/15 text-primary font-semibold">
                  {getInitials(task.owner_id)}
                </AvatarFallback>
              </Avatar>
              <button className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary transition-colors">
                <Plus className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Lock className="w-3 h-3" />
                Share
              </button>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Leave task
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
