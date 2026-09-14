import React, { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { AlertTriangle, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProjectTask, TaskStatus } from './projectTaskTypes';

// Error surfaced on a single card after a failed status update — includes the
// status that was being attempted so the card can offer a one-click retry.
export type TaskCardError = { message: string; targetStatus: TaskStatus };

type ColumnConfig = { key: TaskStatus; label: string; cardClass: string };

const COLUMNS: ColumnConfig[] = [
  { key: 'TODO', label: 'To Do', cardClass: 'available-card' },
  { key: 'IN_PROGRESS', label: 'In Progress', cardClass: 'ongoing-card' },
  { key: 'COMPLETED', label: 'Completed', cardClass: 'finished-card' },
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

type TaskKanbanBoardProps = {
  tasks: ProjectTask[];
  userRole: 'leader' | 'member';
  /** taskId -> status the card should currently be displayed under while a change is in flight */
  optimisticStatus: Record<string, TaskStatus>;
  /** taskId -> true while a status-change request for that task is in flight */
  pendingTaskIds: Record<string, boolean>;
  /** taskId -> error info to surface on that specific card */
  taskErrors: Record<string, TaskCardError>;
  /** Called by both drag-and-drop and the Start/Done buttons */
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
};

const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  userRole,
  optimisticStatus,
  pendingTaskIds,
  taskErrors,
  onStatusChange,
}) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // PointerSensor covers mouse and touch; a small activation distance keeps
  // plain clicks (e.g. on the Start/Done buttons) from being hijacked as drags.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const displayedStatus = (task: ProjectTask): TaskStatus => optimisticStatus[task.id] ?? task.status;

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, ProjectTask[]> = { TODO: [], IN_PROGRESS: [], COMPLETED: [] };
    tasks.forEach((task) => {
      map[displayedStatus(task)].push(task);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, optimisticStatus]);

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) || null : null;
  const activeTaskStatus = activeTask ? displayedStatus(activeTask) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (displayedStatus(task) === newStatus) return;
    onStatusChange(taskId, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="task-board">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            tasks={tasksByColumn[column.key]}
            userRole={userRole}
            pendingTaskIds={pendingTaskIds}
            taskErrors={taskErrors}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' }}>
        {activeTask && activeTaskStatus ? (
          <TaskCard
            task={activeTask}
            status={activeTaskStatus}
            userRole={userRole}
            isPending={false}
            onStatusChange={() => {}}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

type KanbanColumnProps = {
  column: ColumnConfig;
  tasks: ProjectTask[];
  userRole: 'leader' | 'member';
  pendingTaskIds: Record<string, boolean>;
  taskErrors: Record<string, TaskCardError>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
};

// How far one arrow click scrolls — roughly one card's width + gap.
const CARD_SCROLL_STEP = 216;

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  userRole,
  pendingTaskIds,
  taskErrors,
  onStatusChange,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByStep = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: CARD_SCROLL_STEP * direction, behavior: 'smooth' });
  };

  return (
    <div
      ref={setNodeRef}
      className={`task-board-column ${isOver ? 'drag-over' : ''}`}
      role="list"
      aria-label={`${column.label} tasks`}
    >
      <div className={`task-board-column-header status-card ${column.cardClass}`}>
        <span className="status-count">{tasks.length}</span>
        <p>{column.label}</p>
      </div>

      {/* Netflix-row style: cards scroll horizontally, showing a partial
          peek of the next one instead of the column growing arbitrarily
          tall — the arrows page through the rest instead of a long
          vertical stack or list scrollbar. */}
      <div className="task-board-column-carousel">
        <div className="task-board-column-body" ref={scrollRef}>
          {tasks.length === 0 ? (
            <div className={`empty-state-card task-board-empty ${isOver ? 'is-drop-target' : ''}`}>
              <p>{isOver ? 'Drop here to move this task' : 'No tasks here yet.'}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                status={column.key}
                userRole={userRole}
                isPending={!!pendingTaskIds[task.id]}
                error={taskErrors[task.id]}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </div>

        {tasks.length > 1 && (
          <>
            <button
              type="button"
              className="task-board-carousel-arrow prev"
              onClick={() => scrollByStep(-1)}
              aria-label={`Scroll ${column.label} left`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="task-board-carousel-arrow next"
              onClick={() => scrollByStep(1)}
              aria-label={`Scroll ${column.label} right`}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

type TaskCardProps = {
  task: ProjectTask;
  /** The status this card is currently displayed under (optimistic-aware) — drives which action button shows */
  status: TaskStatus;
  userRole: 'leader' | 'member';
  isPending: boolean;
  error?: TaskCardError;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  overlay?: boolean;
};

const TaskCard: React.FC<TaskCardProps> = ({ task, status, userRole, isPending, error, onStatusChange, overlay }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: overlay || isPending,
  });

  const className = [
    'task-board-card',
    overlay ? 'task-board-card-overlay' : '',
    isDragging ? 'dragging' : '',
    isPending ? 'is-pending' : '',
    error ? 'has-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={className}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      role={overlay ? undefined : 'group'}
      aria-roledescription={overlay ? undefined : 'Draggable task card'}
      aria-label={overlay ? undefined : `${task.title} — ${STATUS_LABEL[status]}`}
      tabIndex={overlay ? -1 : 0}
    >
      <div className="task-board-card-top">
        <span className="task-board-card-milestone">{task.milestone}</span>
        {!overlay && <GripVertical className="task-board-card-grip" size={16} aria-hidden="true" />}
      </div>

      <h5 className="task-board-card-title">{task.title}</h5>
      {task.description && <p className="task-board-card-desc">{task.description}</p>}
      {userRole === 'leader' && <p className="task-board-card-assignee">Assigned to: {task.assignedTo}</p>}

      {isPending && !overlay && (
        <div className="task-board-card-saving" aria-live="polite">
          <span className="task-board-spinner" aria-hidden="true" />
          <span>Saving…</span>
        </div>
      )}

      {error && !overlay && (
        <div className="task-board-card-error" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{error.message}</span>
          <button
            type="button"
            className="task-board-card-retry"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onStatusChange(task.id, error.targetStatus)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="task-action-btns task-board-card-actions">
        {status === 'TODO' && (
          <button
            type="button"
            className="task-start-btn"
            disabled={isPending}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
          >
            {isPending ? 'Starting…' : '▶ Start'}
          </button>
        )}
        {status === 'IN_PROGRESS' && (
          <button
            type="button"
            className="task-end-btn"
            disabled={isPending}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onStatusChange(task.id, 'COMPLETED')}
          >
            {isPending ? 'Saving…' : '✓ Done'}
          </button>
        )}
        {status === 'COMPLETED' && <span className="task-done-badge">✓ Completed</span>}
      </div>
    </div>
  );
};

export default TaskKanbanBoard;
