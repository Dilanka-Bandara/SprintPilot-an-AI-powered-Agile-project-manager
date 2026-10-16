import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUp,
  Bug,
  Check,
  GripVertical,
  MessageSquare,
  Plus,
} from 'lucide-react';
import type { Issue } from '@sprintpilot/shared';
export const labels = {
  BACKLOG: 'Backlog',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};
const columns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
function Card({ issue, edit }: { issue: Issue; edit: (issue: Issue) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: issue.id });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      className="issue-card"
    >
      <div className="card-top">
        <span
          className={`tag ${issue.label === 'Experience' ? 'purple' : issue.label.startsWith('AI') ? 'amber' : 'blue'}`}
        >
          {issue.label}
        </span>
        <button
          className="grip"
          aria-label={`Move ${issue.key}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
      </div>
      <button className="card-title" onClick={() => edit(issue)}>
        {issue.title}
      </button>
      <div className="card-footer">
        <span className={`issue-type ${issue.type.toLowerCase()}`}>
          {issue.type === 'BUG' ? <Bug size={13} /> : <Check size={13} />}
        </span>
        <span>{issue.key}</span>
        {issue.priority === 'HIGH' || issue.priority === 'CRITICAL' ? (
          <ArrowUp size={14} className="priority" />
        ) : null}
        <span className="card-spacer" />
        <MessageSquare size={12} />
        <span className="points">{issue.points}</span>
        <span className={`avatar small avatar-${issue.assignee.length % 4}`}>
          {issue.assignee === 'Unassigned' ? '–' : issue.assignee.slice(0, 1)}
        </span>
      </div>
    </article>
  );
}
function Column({
  status,
  issues,
  edit,
  add,
}: {
  status: (typeof columns)[number];
  issues: Issue[];
  edit: (issue: Issue) => void;
  add: (status: Issue['status']) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? 'drop-active' : ''}`}
      aria-label={labels[status]}
    >
      <div className="column-heading">
        <span className={`status-dot ${status}`} />
        <h2>{labels[status]}</h2>
        <span className="count">{issues.length}</span>
        <button
          aria-label={`Add issue to ${labels[status]}`}
          onClick={() => add(status)}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="cards">
        {issues.map((issue) => (
          <Card key={issue.id} issue={issue} edit={edit} />
        ))}
        {issues.length === 0 && (
          <p className="empty-column">Drop an issue here</p>
        )}
        <button className="add-card" onClick={() => add(status)}>
          <Plus size={15} /> Add issue
        </button>
      </div>
    </section>
  );
}
export function Board({
  issues,
  edit,
  add,
  move,
}: {
  issues: Issue[];
  edit: (issue: Issue) => void;
  add: (status: Issue['status']) => void;
  move: (id: string, status: Issue['status']) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (over && columns.includes(over.id as (typeof columns)[number]))
          move(String(active.id), over.id as Issue['status']);
      }}
    >
      <div className="board">
        {columns.map((status) => (
          <Column
            key={status}
            status={status}
            issues={issues.filter((issue) => issue.status === status)}
            edit={edit}
            add={add}
          />
        ))}
      </div>
    </DndContext>
  );
}
