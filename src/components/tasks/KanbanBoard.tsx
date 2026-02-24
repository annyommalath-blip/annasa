import { Task, TaskStatus } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { TaskCard } from './TaskCard';

const columns: { status: TaskStatus; label: string; dotColor: string }[] = [
  { status: 'backlog', label: 'Backlog', dotColor: 'hsl(220 10% 58%)' },
  { status: 'in-progress', label: 'In Progress', dotColor: 'hsl(217 91% 60%)' },
  { status: 'needs-review', label: 'Needs Review', dotColor: 'hsl(38 92% 50%)' },
  { status: 'approved', label: 'Approved', dotColor: 'hsl(142 71% 45%)' },
  { status: 'scheduled', label: 'Scheduled', dotColor: 'hsl(263 70% 58%)' },
  { status: 'posted', label: 'Posted', dotColor: 'hsl(172 66% 40%)' },
];

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const { updateTaskStatus } = useApp();

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) updateTaskStatus(taskId, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        return (
          <div
            key={col.status}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.dotColor }} />
              <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{colTasks.length}</span>
            </div>
            <div className="space-y-3 min-h-[200px] bg-muted/50 rounded-lg p-2">
              {colTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} compact />
              ))}
              {colTasks.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
