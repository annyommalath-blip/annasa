import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Facebook, Check, Clock, Send } from 'lucide-react';
import { Task } from '@/types';
import { useUpdateTask } from '@/hooks/useTasks';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
    </svg>
  );
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500 border-pink-300 bg-pink-50 dark:bg-pink-950/30' },
  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-foreground border-border bg-muted' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30' },
];

interface SchedulePostDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchedulePostDialog({ task, open, onOpenChange }: SchedulePostDialogProps) {
  const updateTask = useUpdateTask();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(task.platforms || []);
  const [postTime, setPostTime] = useState('09:00');
  const [caption, setCaption] = useState(
    (task as any).caption_master || task.description || ''
  );

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const postingDate = task.scheduled_at ? new Date(task.scheduled_at) : new Date();

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      toast({ title: 'Select at least one platform', variant: 'destructive' });
      return;
    }

    // Combine posting date with selected time
    const [hours, minutes] = postTime.split(':').map(Number);
    const scheduledDate = new Date(postingDate);
    scheduledDate.setHours(hours, minutes, 0, 0);

    try {
      await updateTask.mutateAsync({
        id: task.id,
        platforms: selectedPlatforms,
        scheduled_at: scheduledDate.toISOString(),
        caption_master: caption,
        status: 'scheduled' as any,
      });
      toast({ title: 'Post scheduled', description: `Scheduled for ${format(scheduledDate, 'MMM d, yyyy h:mm a')} on ${selectedPlatforms.join(', ')}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Schedule Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Task info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium text-foreground">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Posting date: {format(postingDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Platform selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Post to</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm font-medium",
                      isSelected
                        ? `${platform.color} border-current ring-1 ring-current/20`
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs">{platform.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Posting time</Label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input
                type="time"
                value={postTime}
                onChange={e => setPostTime(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Caption</Label>
            <Textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={4}
              placeholder="Write your caption..."
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-filled from task details. Edit as needed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={updateTask.isPending || selectedPlatforms.length === 0}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {updateTask.isPending ? 'Scheduling...' : 'Schedule Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
