import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
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
...
  const projectName = projects?.find(p => p.id === task?.project_id)?.name ?? '';

  const { data: collaboratorRow } = useQuery({
    queryKey: ['task-collaborator', task?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_collaborators')
        .select('id')
        .eq('task_id', task!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!task?.id && !!user?.id,
  });

  if (!task) return null;

  const canEdit = task.created_by === user?.id || task.owner_id === user?.id;
  const canEditDescription = canEdit || !!collaboratorRow;
...
                <div
                  className={cn(
                    "text-sm min-h-[3rem] whitespace-pre-wrap",
                    task.description ? "text-foreground/80" : "text-muted-foreground italic",
                    canEditDescription && "cursor-text hover:bg-muted/30 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                  )}
                  onClick={() => canEditDescription && setEditingDescription(true)}
                >
                {task.description ? renderTextWithLinks(task.description) : 'What is this task about?'}
              </div>
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
                // Parse @mentions using known profile names for accurate full-name matching
                const profileNames = (profiles || []).map(p => p.full_name).filter(Boolean).sort((a, b) => b.length - a.length);
                const mentionRegex = profileNames.length > 0
                  ? new RegExp(`(@(?:${profileNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'gi')
                  : null;
                const parts = mentionRegex ? c.text.split(mentionRegex) : [c.text];
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
                            <span key={i} className="text-primary font-semibold cursor-pointer hover:underline">{part}</span>
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
