import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { signOut } from 'firebase/auth';
import { ArrowRight, LogOut, Plus, Zap } from 'lucide-react';
import type { Issue } from '@sprintpilot/shared';
import { useAuth } from '../auth/AuthProvider';
import { firebaseAuth } from '../../lib/firebase';
import {
  useCreateWorkspace,
  useRealIssues,
  useRealWorkspace,
  useWorkspaces,
} from './api';
import { Board, labels } from '../board/Board';
import { IssueDialog } from '../backlog/IssueDialog';
function AccountShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  return (
    <div className="account-shell">
      <header className="account-header">
        <Link className="brand" to="/workspaces">
          <span className="brand-icon">
            <Zap size={20} fill="currentColor" />
          </span>
          SprintPilot.
        </Link>
        <div>
          <span>{user?.displayName ?? user?.email}</span>
          <button
            className="secondary"
            onClick={() => {
              void signOut(firebaseAuth()).catch(() =>
                setError('Could not sign out. Please try again.'),
              );
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="account-content">{children}</div>
    </div>
  );
}
export function Workspaces() {
  const query = useWorkspaces();
  const create = useCreateWorkspace();
  const navigate = useNavigate();
  return (
    <AccountShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR TEAM’S HOME BASE</span>
          <h1>
            Your workspaces<span className="heading-dot">.</span>
          </h1>
          <p>Real accounts. Shared work. A fresh place to start.</p>
        </div>
        <Link className="secondary" to="/board">
          Explore demo
        </Link>
      </div>
      <div className="workspace-grid">
        <section className="panel">
          <h2>Choose a workspace</h2>
          {query.isPending ? (
            <p role="status">Loading workspaces…</p>
          ) : query.isError ? (
            <div className="error" role="alert">
              {query.error.message}
              <button onClick={() => void query.refetch()}>Retry</button>
            </div>
          ) : query.data.length === 0 ? (
            <div className="empty-state">
              <h3>Your first workspace starts here</h3>
              <p>
                Create one to start adding real issues. Demo issues remain
                separate.
              </p>
            </div>
          ) : (
            query.data.map((workspace) => (
              <Link
                className="workspace-row"
                key={workspace.id}
                to={`/w/${workspace.id}`}
              >
                <span className="workspace-icon">{workspace.key}</span>
                <div>
                  <strong>{workspace.name}</strong>
                  <small>{workspace.role.toLowerCase()}</small>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))
          )}
        </section>
        <section className="panel">
          <h2>Create a workspace</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              create.mutate(
                {
                  name: String(form.get('name')).trim(),
                  key: String(form.get('key')).trim().toUpperCase(),
                },
                { onSuccess: (workspace) => navigate(`/w/${workspace.id}`) },
              );
            }}
          >
            <label>
              Workspace name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Your team or project"
              />
            </label>
            <label>
              Issue prefix
              <input
                name="key"
                required
                pattern="[A-Za-z]{2,5}"
                minLength={2}
                maxLength={5}
                placeholder="SP"
                style={{ textTransform: 'uppercase' }}
              />
              <small>2–5 letters, used in issue keys such as SP-1.</small>
            </label>
            <button className="primary auth-submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create workspace'}
              <Plus size={16} />
            </button>
            {create.error && (
              <p className="error" role="alert">
                {create.error.message}
              </p>
            )}
          </form>
        </section>
      </div>
    </AccountShell>
  );
}
export function WorkspacePage() {
  const { workspaceId = '' } = useParams();
  const workspace = useRealWorkspace(workspaceId);
  const issues = useRealIssues(workspaceId);
  const [tab, setTab] = useState('board');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    issue?: Issue;
    status: Issue['status'];
  } | null>(null);
  const filtered = (issues.data ?? []).filter((issue) =>
    `${issue.title} ${issue.key}`.toLowerCase().includes(search.toLowerCase()),
  );
  if (workspace.isPending)
    return (
      <AccountShell>
        <p role="status">Loading your workspace…</p>
      </AccountShell>
    );
  if (workspace.isError)
    return (
      <AccountShell>
        <div role="alert" className="error">
          {workspace.error.message}
        </div>
        <Link to="/workspaces">Back to workspaces</Link>
      </AccountShell>
    );
  return (
    <AccountShell>
      <Link className="workspace-back" to="/workspaces">
        ← All workspaces
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{workspace.data.key} · YOUR WORKSPACE</span>
          <h1>
            {workspace.data.name}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            Your issues are saved in PostgreSQL and protected by workspace
            membership.
          </p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setModal({ status: tab === 'backlog' ? 'BACKLOG' : 'TODO' })
          }
        >
          <Plus size={16} />
          Create issue
        </button>
      </div>
      <div className="workspace-tabs" role="group" aria-label="Workspace view">
        {['board', 'backlog', 'members'].map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            className={tab === value ? 'selected' : ''}
            onClick={() => setTab(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'members' ? (
        <section className="panel">
          <h2>Workspace members</h2>
          {workspace.data.members.map((member) => (
            <div className="workspace-row" key={member.user.id}>
              <span className="avatar">{member.user.name[0]}</span>
              <div>
                <strong>{member.user.name}</strong>
                <small>{member.user.email}</small>
              </div>
              <span>{member.role.toLowerCase()}</span>
            </div>
          ))}
          <p className="note">
            Invitations and team assignment are the next workspace feature. For
            now, each workspace starts with its owner.
          </p>
        </section>
      ) : (
        <>
          <label className="search workspace-search">
            <input
              aria-label="Search workspace issues"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or issue key…"
            />
          </label>
          {issues.isPending ? (
            <p role="status">Loading issues…</p>
          ) : issues.isError ? (
            <div className="error" role="alert">
              {issues.error.message}
              <button onClick={() => void issues.refetch()}>Retry</button>
            </div>
          ) : tab === 'board' ? (
            <Board
              issues={filtered}
              edit={(issue) => setModal({ issue, status: issue.status })}
              add={(status) => setModal({ status })}
              move={(issueId, status) =>
                issues.update.mutate({ issueId, status })
              }
            />
          ) : (
            <section className="panel">
              <h2>All issues</h2>
              {filtered.length ? (
                filtered.map((issue) => (
                  <button
                    className="issue-row"
                    key={issue.id}
                    onClick={() => setModal({ issue, status: issue.status })}
                  >
                    <span>{issue.key}</span>
                    <strong>{issue.title}</strong>
                    <span className="row-status">{labels[issue.status]}</span>
                    <span className="points">{issue.points}</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <h3>No issues yet</h3>
                  <p>Create an issue or adjust your search.</p>
                </div>
              )}
            </section>
          )}
          {issues.update.error && !modal && (
            <p role="alert" className="error">
              {issues.update.error.message}
            </p>
          )}
          <div className="note">
            This is your persistent workspace board. Sprint scheduling, events,
            and standups will be connected in the next milestone.
          </div>
        </>
      )}
      {modal && (
        <IssueDialog
          issue={modal.issue}
          initialStatus={modal.status}
          assignees={['Unassigned']}
          close={() => setModal(null)}
          save={(data) =>
            modal.issue
              ? issues.update.mutateAsync({ issueId: modal.issue.id, ...data })
              : issues.create.mutateAsync(data)
          }
          remove={() => issues.remove.mutateAsync(modal.issue!.id)}
        />
      )}
    </AccountShell>
  );
}
