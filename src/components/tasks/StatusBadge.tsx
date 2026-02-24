import { TaskStatus } from '@/types';

const statusConfig: Record<TaskStatus, { label: string; bg: string; color: string }> = {
  'backlog': { label: 'Backlog', bg: 'hsl(220 10% 58% / 0.15)', color: 'hsl(220 10% 58%)' },
  'in-progress': { label: 'In Progress', bg: 'hsl(217 91% 60% / 0.15)', color: 'hsl(217 91% 60%)' },
  'needs-review': { label: 'Needs Review', bg: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 50%)' },
  'approved': { label: 'Approved', bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' },
  'scheduled': { label: 'Scheduled', bg: 'hsl(263 70% 58% / 0.15)', color: 'hsl(263 70% 58%)' },
  'posted': { label: 'Posted', bg: 'hsl(172 66% 40% / 0.15)', color: 'hsl(172 66% 40%)' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
