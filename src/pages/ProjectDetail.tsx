import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProject } from '@/hooks/useProjects';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useSections, useCreateSection, useUpdateSection, useDeleteSection } from '@/hooks/useSections';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { Plus, Globe, Lock, GripVertical, ChevronDown, ChevronRight, Trash2, Pencil, UserPlus, MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { InviteDialog } from '@/components/projects/InviteDialog';

const UNSECTIONED = '__unsectioned__';
const SECTION_PREFIX = 'section::';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(id);
  const { data: profiles } = useProfiles();
  const { data: sections } = useSections(id);
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const updateTask = useUpdateTask();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(searchParams.get('task'));

  // Sync selectedTaskId when navigating from notifications with ?task= param
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam && taskParam !== selectedTaskId) {
      setSelectedTaskId(taskParam);
    }
  }, [searchParams]);
  const [showCreate, setShowCreate] = useState(false);
  const [addingSectionAt, setAddingSectionAt] = useState<number | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getProfileName = (uid: string | null) => profiles?.find(p => p.user_id === uid)?.full_name ?? '';
  const getInitials = (uid: string | null) => {
    const name = getProfileName(uid);
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
  };

  const groupedTasks = useMemo(() => {
    const allTasks = tasks || [];
    const groups: Record<string, Task[]> = { [UNSECTIONED]: [] };
    sections?.forEach(s => { groups[s.id] = []; });
    allTasks.forEach(t => {
      const key = t.section_id && groups[t.section_id] ? t.section_id : UNSECTIONED;
      groups[key].push(t);
    });
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

  const orderedSectionIds = useMemo(() => {
    const ids: string[] = [UNSECTIONED];
    sections?.forEach(s => ids.push(s.id));
    return ids;
  }, [sections]);

  // All sortable IDs: section headers (prefixed) + task IDs
  const allSortableIds = useMemo(() => {
    const ids: string[] = [];
    orderedSectionIds.forEach(sId => {
      if (sId !== UNSECTIONED) ids.push(SECTION_PREFIX + sId);
      groupedTasks[sId]?.forEach(t => ids.push(t.id));
    });
    return ids;
  }, [orderedSectionIds, groupedTasks]);

  const isSectionDragId = (id: string) => id.startsWith(SECTION_PREFIX);
  const getSectionIdFromDrag = (id: string) => id.replace(SECTION_PREFIX, '');

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

  const findTaskSection = (taskId: string): string => {
    for (const sId of orderedSectionIds) {
      if (groupedTasks[sId]?.some(t => t.id === taskId)) return sId;
    }
    return UNSECTIONED;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // --- Section reorder ---
    if (isSectionDragId(activeId)) {
      const draggedSectionId = getSectionIdFromDrag(activeId);
      const sectionOnly = sections || [];

      let targetIndex: number;
      if (isSectionDragId(overId)) {
        const overSectionId = getSectionIdFromDrag(overId);
        targetIndex = sectionOnly.findIndex(s => s.id === overSectionId);
      } else {
        // Dropped over a task — find which section that task belongs to
        const taskSection = findTaskSection(overId);
        targetIndex = taskSection === UNSECTIONED ? 0 : sectionOnly.findIndex(s => s.id === taskSection);
      }
      if (targetIndex < 0) return;

      // Reorder all sections
      const reordered = sectionOnly.filter(s => s.id !== draggedSectionId);
      const draggedSection = sectionOnly.find(s => s.id === draggedSectionId);
      if (!draggedSection) return;
      reordered.splice(targetIndex, 0, draggedSection);
      reordered.forEach((s, i) => {
        updateSection.mutate({ id: s.id, position: i });
      });
      return;
    }

    // --- Task reorder (existing logic) ---
    const isSectionHeader = isSectionDragId(overId);
    let targetSectionId: string | null;
    let targetPosition = 0;

    if (isSectionHeader) {
      const realSectionId = getSectionIdFromDrag(overId);
      targetSectionId = realSectionId;
      const sectionTasks = groupedTasks[realSectionId] || [];
      targetPosition = sectionTasks.length;
    } else if (orderedSectionIds.includes(overId)) {
      // Dropped on UNSECTIONED marker (shouldn't happen with new IDs, but fallback)
      targetSectionId = null;
      targetPosition = (groupedTasks[UNSECTIONED] || []).length;
    } else {
      const overSection = findTaskSection(overId);
      targetSectionId = overSection === UNSECTIONED ? null : overSection;
      const sectionTasks = groupedTasks[overSection] || [];
      const overIndex = sectionTasks.findIndex(t => t.id === overId);
      targetPosition = overIndex >= 0 ? overIndex : sectionTasks.length;
    }

    updateTask.mutate({
      id: activeId,
      section_id: targetSectionId,
      position: targetPosition,
    } as any);

    const targetKey = targetSectionId || UNSECTIONED;
    const sectionTasks = (groupedTasks[targetKey] || []).filter(t => t.id !== activeId);
    sectionTasks.splice(targetPosition, 0, { id: activeId } as Task);
    sectionTasks.forEach((t, i) => {
      if (t.id !== activeId) {
        updateTask.mutate({ id: t.id, position: i } as any);
      }
    });
  };

  const activeTask = activeDragId && !isSectionDragId(activeDragId)
    ? (tasks || []).find(t => t.id === activeDragId)
    : null;
  const activeSectionDrag = activeDragId && isSectionDragId(activeDragId)
    ? sections?.find(s => s.id === getSectionIdFromDrag(activeDragId))
    : null;

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
              <Button variant="outline" onClick={() => setShowInvite(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Invite
              </Button>
              <Button variant="outline" onClick={() => setAddingSectionAt(orderedSectionIds.length)}>
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>
          </div>
        </div>

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
              <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
                <div>
                  {orderedSectionIds.map((sectionId, sIdx) => {
                    const section = sections?.find(s => s.id === sectionId);
                    const isUnsectioned = sectionId === UNSECTIONED;
                    const sectionTasks = groupedTasks[sectionId] || [];
                    const isCollapsed = collapsedSections.has(sectionId);

                    return (
                      <div key={sectionId}>
                        {!isUnsectioned && (
                          <SortableSectionHeader
                            sectionId={sectionId}
                            name={section?.name || ''}
                            taskCount={sectionTasks.length}
                            isCollapsed={isCollapsed}
                            isEditing={editingSectionId === sectionId}
                            editName={editSectionName}
                            onToggleCollapse={() => toggleCollapse(sectionId)}
                            onStartEdit={() => { setEditingSectionId(sectionId); setEditSectionName(section?.name || ''); }}
                            onEditNameChange={setEditSectionName}
                            onFinishEdit={() => handleRenameSection(sectionId)}
                            onCancelEdit={() => setEditingSectionId(null)}
                            onDelete={() => handleDeleteSection(sectionId)}
                          />
                        )}

                        {!isCollapsed && (
                          <>
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
                          </>
                        )}

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
              </SortableContext>

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
                {activeSectionDrag && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-primary/30 rounded-md shadow-lg">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{activeSectionDrag.name}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      <TaskDetailDrawer taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => { setSelectedTaskId(null); searchParams.delete('task'); setSearchParams(searchParams, { replace: true }); }} />
      <CreateTaskDialog open={showCreate} onOpenChange={setShowCreate} defaultProjectId={id} />
      {id && <InviteDialog open={showInvite} onOpenChange={setShowInvite} projectId={id} />}
    </AppLayout>
  );
}

// Sortable section header
function SortableSectionHeader({
  sectionId,
  name,
  taskCount,
  isCollapsed,
  isEditing,
  editName,
  onToggleCollapse,
  onStartEdit,
  onEditNameChange,
  onFinishEdit,
  onCancelEdit,
  onDelete,
}: {
  sectionId: string;
  name: string;
  taskCount: number;
  isCollapsed: boolean;
  isEditing: boolean;
  editName: string;
  onToggleCollapse: () => void;
  onStartEdit: () => void;
  onEditNameChange: (v: string) => void;
  onFinishEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: SECTION_PREFIX + sectionId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border group",
        isDragging && "opacity-30"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/0 group-hover:text-muted-foreground transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      <button onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground">
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isEditing ? (
        <Input
          value={editName}
          onChange={e => onEditNameChange(e.target.value)}
          onBlur={onFinishEdit}
          onKeyDown={e => { if (e.key === 'Enter') onFinishEdit(); if (e.key === 'Escape') onCancelEdit(); }}
          className="h-7 text-sm font-semibold w-60 border-none shadow-none bg-transparent focus-visible:ring-1"
          autoFocus
        />
      ) : (
        <span className="text-sm font-semibold text-foreground">{name}</span>
      )}
      <span className="text-xs text-muted-foreground ml-1">{taskCount}</span>
      <div className="flex-1" />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button onClick={onStartEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Sortable task row
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
