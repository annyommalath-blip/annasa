import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [showCreateTask, setShowCreateTask] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onAddTask={() => setShowCreateTask(true)} />
      <main className="ml-64 p-8">
        {children}
      </main>
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />
    </div>
  );
}
