import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApp } from '@/contexts/AppContext';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Task } from '@/types';

export default function CalendarPage() {
  const { tasks } = useApp();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground mt-1">All scheduled content across projects</p>
        </div>
        <CalendarGrid tasks={tasks} onTaskClick={setSelectedTask} />
        <TaskModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      </div>
    </AppLayout>
  );
}
