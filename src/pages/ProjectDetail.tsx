import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProject } from '@/hooks/useProjects';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useSections, useCreateSection, useUpdateSection, useDeleteSection } from '@/hooks/useSections';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { Plus, Globe, Lock, GripVertical, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';

const UNSECTIONED = '__unsectioned__';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(id);
  const { data: profiles } = useProfiles();
  const { data: sections } = useSections(id);
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const updateTask = useUpdateTask();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [addingSectionAt, setAddingSectionAt] = useState<number | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getProfileName = (uid: string | null) => profiles?.find(p => p.user_id === uid)?.full_name ?? '';
  const getInitials = (uid: string | null) => {
    const name = getProfileName(uid);
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  };

  // Group tasks by section, sort by position then due_at
  const groupedTasks = useMemo(() => {
    const allTasks = tasks || [];
    const groups: Record<string, Task[]> = { [UNSECTIONED]: [] };
    sections?.forEach(s => { groups[s.id] = []; });

    allTasks.forEach(t => {
      const key = t.section_id && groups[t.section_id] ? t.section_id : UNSECTIONED;
      groups[key].push(t);
    });

    // Sort each group by position, then by due_at
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if ((a.position ?? 0) !== (b.position ?? 0)) return (a.position ?? 0) - (b.position ?? 0);
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
    });

    return groups;
  }, [tasks, sections]);

  // Ordered section IDs for rendering
  const orderedSectionIds = useMemo(() => {
    const ids: string[] = [UNSECTIONED];
    sections?.forEach(s => ids.push(s.id));
    return ids;
  }, [sections]);

  // All task IDs for DnD context
  const allTaskIds = useMemo(() => {
    const ids: string[] = [];
    orderedSectionIds.forEach(sId => {
      groupedTasks[sId]?.forEach(t => ids.push(t.id));
    });
    return ids;
  }, [orderedSectionIds, groupedTasks]);

  const handleAddSection = () => {
    if (!newSectionName.trim() || !id) return;
    const position = sections ? sections.length : 0;
    createSection.mutate({ project_id: id, name: newSectionName.trim(), position });
    setNewSectionName('');
    setAddingSectionAt(null);
  };

  const handleRenameSection = (sectionId: string) => {
    if (!editSectionName.trim()) return;
    updateSection.mutate({ id: sectionId, name: editSectionName.trim() });
    setEditingSectionId(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!id) return;
    deleteSection.mutate({ id: sectionId, project_id: id });
  };

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  };

  // Find which section a task belongs to for drag
  const findTaskSection = (taskId: string): string => {
    for (const sId of orderedSectionIds) {
      if (groupedTasks[sId]?.some(t => t.id === taskId)) return sId;
    }
    return UNSECTIONED;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine target section: if dropped over a section header, move to that section
    const isSectionHeader = orderedSectionIds.includes(overId);
    let targetSectionId: string | null;
    let targetPosition = 0;

    if (isSectionHeader) {
      targetSectionId = overId === UNSECTIONED ? null : overId;
      const sectionTasks = groupedTasks[overId] || [];
      targetPosition = sectionTasks.length;
    } else {
      // Dropped over another task
      const overSection = findTaskSection(overId);
      targetSectionId = overSection === UNSECTIONED ? null : overSection;
      const sectionTasks = groupedTasks[overSection] || [];
      const overIndex = sectionTasks.findIndex(t => t.id === overId);
      targetPosition = overIndex >= 0 ? overIndex : sectionTasks.length;
    }

    // Update the dragged task
    updateTask.mutate({
      id: activeId,
      section_id: targetSectionId,
      position: targetPosition,
    } as any);

    // Reorder remaining tasks in the target section
    const targetKey = targetSectionId || UNSECTIONED;
    const sectionTasks = (groupedTasks[targetKey] || []).filter(t => t.id !== activeId);
    sectionTasks.splice(targetPosition, 0, { id: activeId } as Task);
    sectionTasks.forEach((t, i) => {
      if (t.id !== activeId) {
        updateTask.mutate({ id: t.id, position: i } as any);
      }
    });
  };

  const activeTask = activeTaskId ? (tasks || []).find(t => t.id === activeTaskId) : null;

  if (projectLoading) return <AppLayout><div className="text-muted-foreground">Loading...</div></AppLayout>;
  if (!project) return <AppLayout><div className="text-muted-foreground">Project not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-6xl">
        <div className="mb-6">
          <button onClick={() => navigate('/projects')} className="text-sm text-muted-foreground hover:text-foreground mb-2 block">← Projects</button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setAddingSectionAt(orderedSectionIds.length)}>
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[28px_1fr_100px_100px_80px_100px_80px] gap-0 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <span></span>
            <span>Task</span>
            <span>Assignee</span>
            <span>Due Date</span>
            <span className="text-center">Visibility</span>
            <span>Status</span>
            <span>Priority</span>
          </div>

          {tasksLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div>
                {orderedSectionIds.map((sectionId, sIdx) => {
                  const section = sections?.find(s => s.id === sectionId);
                  const isUnsectioned = sectionId === UNSECTIONED;
                  const sectionTasks = groupedTasks[sectionId] || [];
                  const isCollapsed = collapsedSections.has(sectionId);

                  return (
                    <div key={sectionId}>
                      {/* Section header */}
                      {!isUnsectioned && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border group">
                          <button onClick={() => toggleCollapse(sectionId)} className="text-muted-foreground hover:text-foreground">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {editingSectionId === sectionId ? (
                            <Input
                              value={editSectionName}
                              onChange={e => setEditSectionName(e.target.value)}
                              onBlur={() => handleRenameSection(sectionId)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRenameSection(sectionId); if (e.key === 'Escape') setEditingSectionId(null); }}
                              className="h-7 text-sm font-semibold w-60 border-none shadow-none bg-transparent focus-visible:ring-1"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-semibold text-foreground">{section?.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-1">{sectionTasks.length}</span>
                          <div className="flex-1" />
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => { setEditingSectionId(sectionId); setEditSectionName(section?.name || ''); }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(sectionId)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tasks in section */}
                      {!isCollapsed && (
                        <SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                          {sectionTasks.length === 0 && !isUnsectioned ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic border-b border-border">
                              No tasks in this section
                            </div>
                          ) : (
                            sectionTasks.map(task => (
                              <SortableTaskRow
                                key={task.id}
                                task={task}
                                getInitials={getInitials}
                                getProfileName={getProfileName}
                                onSelect={() => setSelectedTaskId(task.id)}
                                onNavigateProject={e => { e.stopPropagation(); navigate(`/projects/${task.project_id}`); }}
                              />
                            ))
                          )}
                        </SortableContext>
                      )}

                      {/* Add section inline input */}
                      {addingSectionAt === sIdx + 1 && (
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20">
                          <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <Input
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setAddingSectionAt(null); }}
                            onBlur={() => { if (!newSectionName.trim()) setAddingSectionAt(null); }}
                            placeholder="Section name (e.g. January work)"
                            className="h-7 text-sm font-semibold border-none shadow-none bg-transparent focus-visible:ring-0"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add section at bottom */}
                {addingSectionAt === null && (
                  <button
                    onClick={() => setAddingSectionAt(orderedSectionIds.length)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border"
                  >
                    <Plus className="w-4 h-4" />
                    Add section
                  </button>
                )}
              </div>

              <DragOverlay>
                {activeTask && (
                  <div className="grid grid-cols-[28px_1fr_100px_100px_80px_100px_80px] gap-0 px-4 py-3 bg-card border border-primary/30 rounded-md shadow-lg">
                    <div className="flex items-center"><GripVertical className="w-4 h-4 text-muted-foreground" /></div>
                    <p className="text-sm font-medium text-foreground truncate">{activeTask.title}</p>
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold">
                        {getInitials(activeTask.owner_id)}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center">{activeTask.due_at ? format(new Date(activeTask.due_at), 'MMM d') : '—'}</span>
                    <div className="flex items-center justify-center">
                      {activeTask.visibility === 'public' ? <Globe className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center"><StatusBadge status={activeTask.status} /></div>
                    <div className="flex items-center"><PriorityBadge priority={activeTask.priority} /></div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      <TaskDetailDrawer taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <CreateTaskDialog open={showCreate} onOpenChange={setShowCreate} defaultProjectId={id} />
    </AppLayout>
  );
}

// Sortable task row component
function SortableTaskRow({
  task,
  getInitials,
  getProfileName,
  onSelect,
  onNavigateProject,
}: {
  task: Task;
  getInitials: (id: string | null) => string;
  getProfileName: (id: string | null) => string;
  onSelect: () => void;
  onNavigateProject: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[28px_1fr_100px_100px_80px_100px_80px] gap-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group",
        isDragging && "opacity-30"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors cursor-grab" />
      </div>
      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors flex items-center">{task.title}</p>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold" title={getProfileName(task.owner_id)}>
          {getInitials(task.owner_id)}
        </div>
        <span className="text-xs text-muted-foreground truncate">{getProfileName(task.owner_id).split(' ')[0]}</span>
      </div>
      <span className="text-xs text-muted-foreground flex items-center">{task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}</span>
      <div className="flex items-center justify-center">
        {task.visibility === 'public' ? <Globe className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className="flex items-center"><StatusBadge status={task.status} /></div>
      <div className="flex items-center"><PriorityBadge priority={task.priority} /></div>
    </div>
  );
}
