import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMyTasks, useUpdateTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Task } from '@/types';
import { ChevronLeft, ChevronRight, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, isToday,
} from 'date-fns';
import { SchedulePostDialog } from '@/components/calendar/SchedulePostDialog';
import { cn } from '@/lib/utils';

// TikTok icon as inline SVG since lucide doesn't have it
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
    </svg>
  );
}

export default function ContentCalendar() {
  const { data: tasks } = useMyTasks();
  const { data: projects } = useProjects();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Only show tasks that have a posting date (scheduled_at) and are completed
  const calendarTasks = useMemo(() => {
    return (tasks || []).filter(t => t.scheduled_at && t.status === 'done');
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

  const getPlatformIcons = (platforms: string[] | null) => {
    if (!platforms || platforms.length === 0) return null;
    return (
      <div className="flex gap-0.5">
        {platforms.includes('instagram') && <Instagram className="w-3 h-3 text-pink-500" />}
        {platforms.includes('facebook') && <Facebook className="w-3 h-3 text-blue-600" />}
        {platforms.includes('tiktok') && <TikTokIcon className="w-3 h-3" />}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {calendarTasks.length} scheduled post{calendarTasks.length !== 1 ? 's' : ''}
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
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="px-2 py-2.5 text-xs font-semibold text-muted-foreground text-center bg-muted/30">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[110px] border-b border-r border-border p-1.5 transition-colors",
                    !inMonth && "bg-muted/20",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground",
                    !inMonth && "text-muted-foreground/50",
                    inMonth && !isToday(day) && "text-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-left px-1.5 py-1 rounded text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate flex items-center gap-1"
                        title={task.title}
                      >
                        {getPlatformIcons(task.platforms)}
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
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
