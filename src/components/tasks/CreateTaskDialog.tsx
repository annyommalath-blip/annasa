import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Globe, Lock, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateTask } from '@/hooks/useTasks';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useTeams, useTeamMembers } from '@/hooks/useTeam';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { TaskPriority, Visibility } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function CreateTaskDialog({ open, onOpenChange, defaultProjectId }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const { data: teams } = useTeams();
  const { data: profiles } = useProfiles();
  const createTask = useCreateTask();
  const createProject = useCreateProject();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [startDate, setStartDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [postingDate, setPostingDate] = useState<Date>();
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [assigneeId, setAssigneeId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Get team_id for selected project
  const selectedProject = projects?.find(p => p.id === projectId);
  const selectedTeamId = selectedProject?.team_id;
  const { data: teamMembers } = useTeamMembers(selectedTeamId);

  // Build assignee options: project members when project selected, otherwise just yourself
  const assigneeOptions = React.useMemo(() => {
    const selfOption = user
      ? [{ user_id: user.id, full_name: profiles?.find(p => p.user_id === user.id)?.full_name ? `${profiles.find(p => p.user_id === user.id)!.full_name} (You)` : 'Yourself' }]
      : [];

    if (!projectId || !teamMembers || !profiles) {
      return selfOption;
    }

    const memberIds = teamMembers.map(m => m.user_id);
    const options = profiles
      .filter(p => memberIds.includes(p.user_id))
      .map(p => ({
        user_id: p.user_id,
        full_name: p.user_id === user?.id ? `${p.full_name} (You)` : p.full_name,
      }));
    return options.length > 0 ? options : selfOption;
  }, [projectId, teamMembers, profiles, user]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setProjectId(defaultProjectId || '');
    setStartDate(undefined);
    setDueDate(undefined);
    setPostingDate(undefined);
    setVisibility('public');
    setAssigneeId('');
    setNewProjectName('');
    setShowNewProject(false);
    setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalProjectId = projectId;

    // Create project inline if needed
    if (showNewProject && newProjectName.trim() && teams?.[0]) {
      try {
        const newProject = await createProject.mutateAsync({
          name: newProjectName.trim(),
          teamId: teams[0].id,
        });
        finalProjectId = newProject.id;
      } catch (err: any) {
        toast({ title: 'Error creating project', description: err.message, variant: 'destructive' });
        return;
      }
    }

    if (!title.trim() || !finalProjectId) {
      toast({ title: 'Missing fields', description: 'Title and project are required.', variant: 'destructive' });
      return;
    }

    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        description: description || undefined,
        priority,
        project_id: finalProjectId,
        start_date: startDate ? startDate.toISOString() : undefined,
        due_at: dueDate ? dueDate.toISOString() : undefined,
        scheduled_at: postingDate ? postingDate.toISOString() : undefined,
        visibility,
        owner_id: assigneeId || user?.id,
        status: 'not_started',
      });
      // Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `${task.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(filePath, file);
          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }
          const { data: urlData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(filePath);
          await supabase.from('attachments').insert({
            task_id: task.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type || null,
            file_size: file.size,
            uploaded_by: user!.id,
          });
        }
      }

      toast({ title: 'Task created' });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task name" required />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Project *</Label>
              <button type="button" onClick={() => setShowNewProject(!showNewProject)} className="text-xs text-primary hover:underline">
                {showNewProject ? 'Select existing' : '+ New project'}
              </button>
            </div>
            {showNewProject ? (
              <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="New project name" />
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Posting Date */}
            <div className="space-y-2">
              <Label>Posting Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !postingDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {postingDate ? format(postingDate, 'MMM d, yyyy') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={postingDate} onSelect={setPostingDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={v => setVisibility(v as Visibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <span className="flex items-center gap-2"><Globe className="w-3 h-3" /> Public</span>
                </SelectItem>
                <SelectItem value="private">
                  <span className="flex items-center gap-2"><Lock className="w-3 h-3" /> Private</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details..." rows={3} />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
              <Paperclip className="w-4 h-4" />
              <span>Click to attach files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  e.target.value = '';
                }}
              />
            </label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded text-xs">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
