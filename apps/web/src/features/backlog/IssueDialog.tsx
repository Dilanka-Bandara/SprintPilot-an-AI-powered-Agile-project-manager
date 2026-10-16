import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  issueInput,
  statuses,
  type Issue,
  type IssueInput,
} from '@sprintpilot/shared';
import { labels } from '../board/Board';
export function IssueDialog({
  issue,
  initialStatus,
  close,
  save,
  remove,
}: {
  issue?: Issue;
  initialStatus: Issue['status'];
  close: () => void;
  save: (data: IssueInput) => Promise<unknown>;
  remove: () => Promise<unknown>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} onCancel={close} aria-labelledby="issue-heading">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          const data = Object.fromEntries(new FormData(event.currentTarget));
          const parsed = issueInput.safeParse({
            ...data,
            points: Number(data.points),
          });
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setBusy(true);
          try {
            await save(parsed.data);
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{issue?.key ?? 'A NEW POSSIBILITY'}</span>
            <h2 id="issue-heading">
              {issue ? 'Issue details' : 'Create an issue'}
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <label>
          Title
          <input
            name="title"
            autoFocus
            required
            maxLength={180}
            defaultValue={issue?.title}
            placeholder="What needs to happen?"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            defaultValue={issue?.description}
            placeholder="Add context, requirements, or acceptance criteria…"
          />
        </label>
        <div className="form-grid">
          <label>
            Status
            <select name="status" defaultValue={issue?.status ?? initialStatus}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {labels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select name="type" defaultValue={issue?.type ?? 'STORY'}>
              {['STORY', 'TASK', 'BUG'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={issue?.priority ?? 'MEDIUM'}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Story points
            <select name="points" defaultValue={issue?.points ?? 3}>
              {[0, 1, 2, 3, 5, 8, 13].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              name="assignee"
              defaultValue={issue?.assignee ?? 'Unassigned'}
            >
              {['Unassigned', 'Dilanka', 'Maya', 'Alex', 'Sam'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Label
            <select name="label" defaultValue={issue?.label ?? 'Platform'}>
              {['Platform', 'Experience', 'AI & automation'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          {issue && (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={async () => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                setBusy(true);
                try {
                  await remove();
                  close();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmDelete ? 'Confirm delete' : 'Delete issue'}
            </button>
          )}
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : issue ? 'Save changes' : 'Create issue'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
