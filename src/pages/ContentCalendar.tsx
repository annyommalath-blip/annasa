import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMyTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Task } from '@/types';
import { ChevronLeft, ChevronRight, Instagram, Facebook, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, isToday,
} from 'date-fns';
import { SchedulePostDialog } from '@/components/calendar/SchedulePostDialog';
import { cn } from '@/lib/utils';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
    </svg>
  );
}

// Platform badge chip like in Sprout Social
function PlatformChip({ platform, count }: { platform: string; count?: number }) {
  const config: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
    instagram: { icon: Instagram, bg: 'bg-pink-100 dark:bg-pink-950/40', text: 'text-pink-600 dark:text-pink-400' },
    facebook: { icon: Facebook, bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
    tiktok: { icon: TikTokIcon, bg: 'bg-muted', text: 'text-foreground' },
  };
  const c = config[platform];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", c.bg, c.text)}>
      <Icon className="w-3 h-3" />
      {count !== undefined && count}
    </span>
  );
}

export default function ContentCalendar() {
  const { data: tasks } = useMyTasks();
  const { data: projects } = useProjects();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Show ALL tasks that have a posting date (scheduled_at), regardless of status
  const calendarTasks = useMemo(() => {
    return (tasks || []).filter(t => t.scheduled_at);
  }, [tasks]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return calendarTasks.filter(t => t.scheduled_at && isSameDay(new Date(t.scheduled_at), day));
  };

  const getProjectName = (id: string) => projects?.find(p => p.id === id)?.name ?? '';

  // Deterministic color palette for projects
  const projectColorMap = useMemo(() => {
    const palette = [
      { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
      { bg: 'bg-violet-100 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
      { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      { bg: 'bg-rose-100 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
      { bg: 'bg-cyan-100 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
      { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
      { bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/40', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
    ];
    const map: Record<string, typeof palette[0]> = {};
    const projectIds = [...new Set((tasks || []).map(t => t.project_id))];
    projectIds.forEach((id, i) => {
      map[id] = palette[i % palette.length];
    });
    return map;
  }, [tasks]);

  const getProjectColor = (projectId: string) => {
    return projectColorMap[projectId] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
  };

  // Aggregate platform counts for a day
  const getDayPlatformCounts = (dayTasks: Task[]) => {
    const counts: Record<string, number> = {};
    dayTasks.forEach(t => {
      (t.platforms || []).forEach(p => {
        counts[p] = (counts[p] || 0) + 1;
      });
    });
    return counts;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {calendarTasks.length} post{calendarTasks.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="ml-2 h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="px-2 py-2.5 text-xs font-semibold text-muted-foreground text-center bg-muted/30 border-r border-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const platformCounts = getDayPlatformCounts(dayTasks);
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[130px] border-b border-r border-border last:border-r-0 p-1.5 transition-colors",
                    !inMonth && "bg-muted/10",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={cn(
                      "text-xs font-medium flex items-center justify-center w-6 h-6 rounded-full",
                      isToday(day) && "bg-primary text-primary-foreground",
                      !inMonth && "text-muted-foreground/40",
                      inMonth && !isToday(day) && "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>

                  {/* Platform count chips - like Sprout Social */}
                  {Object.keys(platformCounts).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {Object.entries(platformCounts).map(([platform, count]) => (
                        <PlatformChip key={platform} platform={platform} count={count} />
                      ))}
                    </div>
                  )}

                  {/* Task labels with content name */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => {
                      const color = getProjectColor(task.project_id);
                      return (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={cn(
                            "w-full text-left px-1.5 py-1 rounded text-[10px] font-medium border transition-colors truncate flex items-center gap-1 hover:opacity-80",
                            color.bg, color.text, color.border
                          )}
                          title={`${task.title} — ${getProjectName(task.project_id)}`}
                        >
                          {task.asset_urls && task.asset_urls.length > 0 && (
                            <LinkIcon className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          )}
                          <span className="truncate">{task.title}</span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1.5">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTask && (
        <SchedulePostDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        />
      )}
    </AppLayout>
  );
}
