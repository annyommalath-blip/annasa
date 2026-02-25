import { TaskPriority } from '@/types';

const priorityConfig: Record<TaskPriority, { label: string; bg: string; color: string }> = {
  low: { label: 'Low', bg: 'hsl(215 14% 58% / 0.15)', color: 'hsl(215 14% 58%)' },
  medium: { label: 'Medium', bg: 'hsl(217 91% 60% / 0.15)', color: 'hsl(217 91% 60%)' },
  high: { label: 'High', bg: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)' },
  urgent: { label: 'Urgent', bg: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 60%)' },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
