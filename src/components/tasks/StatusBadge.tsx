import { TaskStatus } from '@/types';

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Not Started', bg: 'hsl(220 10% 58% / 0.15)', color: 'hsl(220 10% 58%)' },
  in_progress: { label: 'In Progress', bg: 'hsl(217 91% 60% / 0.15)', color: 'hsl(217 91% 60%)' },
  done: { label: 'Done', bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' },
  draft: { label: 'Draft', bg: 'hsl(220 10% 58% / 0.15)', color: 'hsl(220 10% 58%)' },
  needs_review: { label: 'Needs Review', bg: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 50%)' },
  approved: { label: 'Approved', bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' },
  scheduled: { label: 'Scheduled', bg: 'hsl(263 70% 58% / 0.15)', color: 'hsl(263 70% 58%)' },
  posted: { label: 'Posted', bg: 'hsl(172 66% 40% / 0.15)', color: 'hsl(172 66% 40%)' },
  failed: { label: 'Failed', bg: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 60%)' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
