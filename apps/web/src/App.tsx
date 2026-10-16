import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  GitBranch,
  Layers,
  LayoutDashboard,
  ListFilter,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Issue, State } from '@sprintpilot/shared';
import { useIssueActions, useWorkspace } from './features/backlog/api';
import { Board, labels } from './features/board/Board';
import { IssueDialog } from './features/backlog/IssueDialog';
const nav = [
  { path: '/board', label: 'Sprint board', icon: LayoutDashboard },
  { path: '/backlog', label: 'Backlog', icon: Layers },
  { path: '/standups', label: 'Standups', icon: MessageCircle },
  { path: '/insights', label: 'Insights', icon: ChartNoAxesCombined },
];
export function App() {
  const workspace = useWorkspace();
  const actions = useIssueActions();
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState('Everyone');
  const [priority, setPriority] = useState('All priorities');
  const [modal, setModal] = useState<{
    issue?: Issue;
    status: Issue['status'];
  } | null>(null);
  const [mobile, setMobile] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const page =
    nav.find((item) => item.path === location.pathname)?.label ??
    (location.pathname === '/assistant'
      ? 'AI assistant'
      : 'Workspace settings');
  const issues = workspace.data?.issues ?? [];
  const active = issues.filter((issue) => issue.status !== 'BACKLOG');
  const filtered = issues.filter(
    (issue) =>
      `${issue.title} ${issue.key}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (assignee === 'Everyone' || issue.assignee === assignee) &&
      (priority === 'All priorities' || issue.priority === priority),
  );
  const donePoints = active
    .filter((issue) => issue.status === 'DONE')
    .reduce((n, issue) => n + issue.points, 0);
  const totalPoints = active.reduce((n, issue) => n + issue.points, 0);
  const edit = (issue: Issue) => setModal({ issue, status: issue.status });
  const add = (status: Issue['status']) => setModal({ status });
  return (
    <div className="app">
      <aside className={mobile ? 'sidebar open' : 'sidebar'}>
        <a className="brand" href="/board">
          <span className="brand-icon">
            <Zap fill="currentColor" size={21} />
          </span>
          SprintPilot<span className="brand-period">.</span>
        </a>
        <button
          className="mobile-close"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <div className="workspace-switch">
          <span className="workspace-icon">S</span>
          <div>
            <strong>SprintPilot team</strong>
            <small>Demo workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobile(false)}
            >
              <item.icon size={18} />
              {item.label}
              {item.path === '/backlog' && (
                <span className="nav-count">
                  {issues.filter((issue) => issue.status === 'BACKLOG').length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <span className="nav-label tools-label">YOUR CO-PILOT</span>
        <nav>
          <NavLink to="/assistant" onClick={() => setMobile(false)}>
            <Sparkles size={18} />
            AI assistant<span className="soon">SOON</span>
          </NavLink>
          <NavLink to="/settings" onClick={() => setMobile(false)}>
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <span className="tip-icon">
              <Sparkles size={19} />
            </span>
            <strong>
              Less busywork.
              <br />
              More building.
            </strong>
            <p>Your next great sprint starts with a little clarity.</p>
            <NavLink to="/assistant">
              Meet your co-pilot <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <a
            className="help-link"
            href="https://github.com/Dilanka-Bandara/SprintPilot-an-AI-powered-Agile-project-manager"
            target="_blank"
            rel="noreferrer"
          >
            <CircleHelp size={17} />
            Project & documentation
            <ArrowUpRight size={14} />
          </a>
          <div className="profile">
            <span className="avatar">DB</span>
            <div>
              <strong>Dilanka Bandara</strong>
              <small>Local demo profile</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="breadcrumbs">
            Workspace <span>/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span />
              LOCAL DEMO
            </span>
            <a
              href="http://127.0.0.1:4000/docs"
              target="_blank"
              rel="noreferrer"
            >
              API docs <ArrowUpRight size={13} />
            </a>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">LET’S MAKE PROGRESS</div>
              <h1>
                {page}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {page === 'Sprint board'
                  ? 'A little focus. A lot of forward motion.'
                  : page === 'Backlog'
                    ? 'Big ideas, broken into the next right steps.'
                    : page === 'Standups'
                      ? 'Stay in sync, without another meeting.'
                      : page === 'Insights'
                        ? 'See the story behind your sprint.'
                        : page === 'AI assistant'
                          ? 'An extra pair of hands for your team.'
                          : 'A home for the way your team works.'}
              </p>
            </div>
            {['/board', '/backlog'].includes(location.pathname) && (
              <button
                className="primary"
                onClick={() =>
                  add(location.pathname === '/backlog' ? 'BACKLOG' : 'TODO')
                }
              >
                <Plus size={17} />
                Create issue
              </button>
            )}
          </div>
          {workspace.isPending ? (
            <div className="loading" role="status">
              <div className="skeleton" />
              <div className="skeleton" />
              <p>Getting your workspace ready…</p>
            </div>
          ) : workspace.isError ? (
            <div className="empty-state" role="alert">
              <h2>We couldn’t load your workspace</h2>
              <p>{workspace.error.message}</p>
              <button
                className="primary"
                onClick={() => void workspace.refetch()}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="error" role="alert">
                  {error}
                  <button
                    onClick={() => setError('')}
                    aria-label="Dismiss error"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              <Routes>
                <Route path="/" element={<Navigate to="/board" replace />} />
                <Route
                  path="/board"
                  element={
                    <>
                      <section className="sprint-summary">
                        <div className="sprint-main">
                          <div className="sprint-title">
                            <span className="sprint-symbol">
                              <Zap size={19} />
                            </span>
                            <h2>Sprint 01</h2>
                            <span className="active-badge">Active demo</span>
                          </div>
                          <p>
                            Build a strong foundation. Make teamwork feel
                            effortless.
                          </p>
                          <div className="sprint-meta">
                            <span>
                              <CalendarDays size={14} />
                              Sample sprint
                            </span>
                            <span>
                              <Target size={14} />
                              {active.length} issues in scope
                            </span>
                          </div>
                        </div>
                        <div className="sprint-progress">
                          <div>
                            <span>Sprint progress</span>
                            <strong>
                              {donePoints}
                              <span> / {totalPoints} pts</span>
                            </strong>
                          </div>
                          <div className="progress-track">
                            <div
                              style={{
                                width: `${totalPoints ? (donePoints / totalPoints) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span>
                            {totalPoints
                              ? Math.round((donePoints / totalPoints) * 100)
                              : 0}
                            % complete · Keep the momentum going
                          </span>
                        </div>
                      </section>
                      <section className="insight-banner">
                        <span className="insight-icon">
                          <Sparkles size={19} />
                        </span>
                        <p>
                          <strong>A clearer path to done.</strong>{' '}
                          {
                            active.filter(
                              (issue) => issue.status === 'IN_REVIEW',
                            ).length
                          }{' '}
                          issues are ready for review. A quick check could
                          unblock your next milestone.
                        </p>
                        <NavLink to="/insights">
                          View insights
                          <ArrowRight size={15} />
                        </NavLink>
                      </section>
                      {filters()}
                      <Board
                        issues={filtered}
                        edit={edit}
                        add={add}
                        move={(id, status) => {
                          setError('');
                          actions.update.mutate(
                            { id, status },
                            { onError: (e) => setError(e.message) },
                          );
                        }}
                      />
                      <div className="board-caption">
                        <span>
                          <span className="live-dot" />
                          Changes saved locally
                        </span>
                        <span>
                          Drag by the grip to move · Open an issue to edit its
                          status
                        </span>
                      </div>
                    </>
                  }
                />
                <Route
                  path="/backlog"
                  element={
                    <>
                      {filters()}
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>
                            All issues{' '}
                            <span className="count">{filtered.length}</span>
                          </h2>
                          <span>Your next great ideas live here</span>
                        </div>
                        {filtered.length === 0 ? (
                          <div className="empty-state">
                            <Layers />
                            <h2>No issues found</h2>
                            <p>Create an issue or adjust your filters.</p>
                          </div>
                        ) : (
                          <div className="issue-table">
                            {filtered.map((issue) => (
                              <button
                                className="issue-row"
                                key={issue.id}
                                onClick={() => edit(issue)}
                              >
                                <span
                                  className={`issue-type ${issue.type.toLowerCase()}`}
                                >
                                  <Check size={13} />
                                </span>
                                <span className="muted">{issue.key}</span>
                                <strong>{issue.title}</strong>
                                <span className="row-status">
                                  {labels[issue.status]}
                                </span>
                                <span className="points">{issue.points}</span>
                                <span className="avatar small">
                                  {issue.assignee[0]}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  }
                />
                <Route
                  path="/standups"
                  element={
                    <Standups
                      data={workspace.data}
                      save={(input) => actions.standup.mutateAsync(input)}
                    />
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <>
                      <div className="stats">
                        <Stat
                          label="Issues in sprint"
                          value={active.length}
                          note="Current scope"
                        />
                        <Stat
                          label="Completed points"
                          value={donePoints}
                          note={`of ${totalPoints} planned points`}
                        />
                        <Stat
                          label="In progress"
                          value={
                            active.filter((i) => i.status === 'IN_PROGRESS')
                              .length
                          }
                          note="Work happening now"
                        />
                        <Stat
                          label="Ready for review"
                          value={
                            active.filter((i) => i.status === 'IN_REVIEW')
                              .length
                          }
                          note="Your next opportunity"
                        />
                      </div>
                      <section className="panel chart-panel">
                        <h2>Where the work stands</h2>
                        <p>Live issue counts from this demo workspace</p>
                        <div className="chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(labels).map(
                                ([key, label]) => ({
                                  name: label,
                                  issues: issues.filter((i) => i.status === key)
                                    .length,
                                }),
                              )}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#eceae6"
                              />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip cursor={{ fill: '#faf7f3' }} />
                              <Bar
                                dataKey="issues"
                                fill="#ed704b"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={55}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                      <div className="note">
                        <ChartNoAxesCombined size={18} />
                        <p>
                          Historical burndown, velocity, and cycle time will
                          become available when sprint events are connected to
                          the Go insights service.
                        </p>
                      </div>
                    </>
                  }
                />
                <Route
                  path="/assistant"
                  element={
                    <section className="assistant-panel">
                      <span className="assistant-orb">
                        <Sparkles size={34} />
                      </span>
                      <span className="eyebrow">YOUR FUTURE CO-PILOT</span>
                      <h2>More space for your best work.</h2>
                      <p>
                        Turn rough ideas into stories, find a realistic sprint
                        scope, and bring the team’s updates together.
                      </p>
                      <div className="assistant-options">
                        {[
                          [
                            'Story Writer',
                            'Shape an idea into clear, actionable stories.',
                          ],
                          [
                            'Sprint Planner',
                            'Plan around capacity, not guesswork.',
                          ],
                          [
                            'Standup Summarizer',
                            'Find the blockers hiding in daily updates.',
                          ],
                        ].map(([title, text]) => (
                          <div key={title}>
                            <Sparkles size={19} />
                            <h3>{title}</h3>
                            <p>{text}</p>
                            <span>Coming in the AI milestone</span>
                          </div>
                        ))}
                      </div>
                      <div className="note">
                        <CircleHelp size={18} />
                        <p>
                          Gemini is not connected yet. This preview does not
                          generate or simulate AI answers. The Python service
                          foundation is included in the repository.
                        </p>
                      </div>
                    </section>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <section className="panel settings">
                      <h2>SprintPilot team</h2>
                      <p>A local workspace for exploring the product.</p>
                      <dl>
                        <dt>Workspace key</dt>
                        <dd>SP</dd>
                        <dt>Storage</dt>
                        <dd>Local JSON file · .data/demo.json</dd>
                        <dt>Profile</dt>
                        <dd>Dilanka · demo identity</dd>
                        <dt>Team authentication</dt>
                        <dd>Firebase integration planned</dd>
                        <dt>GitHub integration</dt>
                        <dd>Not connected</dd>
                        <dt>AI provider</dt>
                        <dd>Gemini · not configured</dd>
                      </dl>
                      <div className="note">
                        <GitBranch size={18} />
                        <p>
                          This is the first working milestone. Multi-user
                          workspaces, invitations, GitHub webhooks, and cloud
                          deployment are tracked in the project roadmap.
                        </p>
                      </div>
                    </section>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <h2>This page has flown off course</h2>
                      <NavLink to="/board">Back to the board</NavLink>
                    </div>
                  }
                />
              </Routes>
            </>
          )}
          <footer className="page-footer">
            <span className="footer-brand">
              <Zap size={12} /> SPRINTPILOT
            </span>
            <span>Small steps. Great sprints.</span>
            <span>Built for the way teams move.</span>
          </footer>
        </div>
      </main>
      {modal && (
        <IssueDialog
          issue={modal.issue}
          initialStatus={modal.status}
          close={() => setModal(null)}
          save={(data) =>
            modal.issue
              ? actions.update.mutateAsync({ id: modal.issue.id, ...data })
              : actions.create.mutateAsync(data)
          }
          remove={() => actions.remove.mutateAsync(modal.issue!.id)}
        />
      )}
    </div>
  );
  function filters() {
    return (
      <div className="filters">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search issues"
            placeholder="Search issues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Command size={13} />
        </label>
        <label className="filter-select">
          <Users size={15} />
          <select
            aria-label="Filter by assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            {['Everyone', 'Dilanka', 'Maya', 'Alex', 'Sam', 'Unassigned'].map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </label>
        <label className="filter-select">
          <ListFilter size={15} />
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {['All priorities', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </label>
        <div className="team-avatars">
          {['D', 'M', 'A', 'S'].map((initial, i) => (
            <span className={`avatar small avatar-${i}`} key={initial}>
              {initial}
            </span>
          ))}
          <span className="team-label">4 demo members</span>
        </div>
      </div>
    );
  }
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>
        {value}
        <ArrowDown size={17} />
      </strong>
      <small>{note}</small>
    </div>
  );
}
function Standups({
  data,
  save,
}: {
  data: State;
  save: (input: {
    yesterday: string;
    today: string;
    blockers: string;
  }) => Promise<unknown>;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const today = data.standups.find((item) => item.date === date);
  return (
    <div className="standup-grid">
      <section className="panel standup-form">
        <h2>Your daily check-in</h2>
        <p>{date} · Asia/Colombo</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setMessage('');
            try {
              await save({
                yesterday: String(form.get('yesterday')),
                today: String(form.get('today')),
                blockers: String(form.get('blockers')),
              });
              setMessage('Your standup is saved. You’re all caught up!');
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {[
            ['yesterday', 'What did you work on yesterday?'],
            ['today', 'What’s your focus today?'],
            ['blockers', 'Anything in your way?'],
          ].map(([key, title]) => (
            <label key={key}>
              {title}
              <textarea
                name={key}
                required={key !== 'blockers'}
                maxLength={2000}
                rows={3}
                defaultValue={
                  today?.[key as 'yesterday' | 'today' | 'blockers']
                }
                placeholder={
                  key === 'blockers'
                    ? 'No blockers? Leave this empty.'
                    : 'Share a quick update…'
                }
              />
            </label>
          ))}
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : today ? 'Update standup' : 'Post standup'}
            <ArrowRight size={15} />
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
      <section className="panel team-updates">
        <h2>Team updates</h2>
        <p>Today’s check-ins</p>
        {data.standups
          .filter((item) => item.date === date)
          .map((item) => (
            <article className="standup-card" key={item.author}>
              <h3>
                <span className="avatar small">D</span>
                {item.author}
              </h3>
              <small>YESTERDAY</small>
              <p>{item.yesterday}</p>
              <small>TODAY</small>
              <p>{item.today}</p>
              {item.blockers && (
                <div className="blocker">
                  <strong>Blocker</strong>
                  <p>{item.blockers}</p>
                </div>
              )}
            </article>
          ))}
        {!today && (
          <div className="empty-state">
            <MessageCircle />
            <h3>Start the conversation</h3>
            <p>Your first update will appear here.</p>
          </div>
        )}
        <div className="note">
          <Users size={18} />
          <p>
            Maya, Alex, and Sam are sample profiles. Only your local demo
            profile can post updates in this milestone.
          </p>
        </div>
      </section>
    </div>
  );
}
