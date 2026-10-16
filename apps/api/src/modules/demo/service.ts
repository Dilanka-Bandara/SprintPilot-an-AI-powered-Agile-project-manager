import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stateSchema, type IssueInput, type State } from '@sprintpilot/shared';

export class NotFound extends Error {}
const seeds: [
  string,
  IssueInput['status'],
  IssueInput['type'],
  IssueInput['label'],
  number,
][] = [
  ['Build the workspace onboarding flow', 'TODO', 'STORY', 'Experience', 5],
  ['Add keyboard shortcuts to the board', 'TODO', 'TASK', 'Experience', 3],
  ['Design the sprint insights dashboard', 'TODO', 'STORY', 'Experience', 5],
  ['Create the issue detail drawer', 'IN_PROGRESS', 'STORY', 'Platform', 5],
  ['Connect the GitHub webhook handler', 'IN_PROGRESS', 'TASK', 'Platform', 8],
  [
    'Fix card alignment on small screens',
    'IN_PROGRESS',
    'BUG',
    'Experience',
    2,
  ],
  ['Add acceptance criteria to stories', 'IN_REVIEW', 'STORY', 'Platform', 3],
  ['Refine the Story Writer prompt', 'IN_REVIEW', 'TASK', 'AI & automation', 3],
  ['Set up the monorepo workspace', 'DONE', 'TASK', 'Platform', 3],
  ['Create shared validation schemas', 'DONE', 'TASK', 'Platform', 2],
  [
    'Explore sprint planning suggestions',
    'BACKLOG',
    'STORY',
    'AI & automation',
    8,
  ],
  ['Add team invitations', 'BACKLOG', 'STORY', 'Platform', 5],
];
export function seed(): State {
  const now = new Date().toISOString();
  return {
    counter: seeds.length,
    standups: [],
    issues: seeds.map(([title, status, type, label, points], i) => ({
      id: randomUUID(),
      key: `SP-${i + 1}`,
      title,
      status,
      type,
      label,
      points: points as IssueInput['points'],
      description:
        'Sample issue for exploring SprintPilot. Edit this description to make it your own.',
      priority: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
      assignee: (['Dilanka', 'Maya', 'Alex', 'Sam'] as const)[i % 4],
      createdAt: now,
      updatedAt: now,
    })),
  };
}

export class DemoService {
  private state: State;
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(
    state: State,
    private path?: string,
  ) {
    this.state = state;
  }
  static async open(path?: string) {
    let state = seed();
    if (path) {
      try {
        state = stateSchema.parse(JSON.parse(await readFile(path, 'utf8')));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return new DemoService(state, path);
  }
  snapshot() {
    return structuredClone(this.state);
  }
  private mutate<T>(fn: (draft: State) => T): Promise<T> {
    // Serialize read-modify-write operations so concurrent requests cannot reuse issue numbers.
    const next = this.queue.then(async () => {
      const draft = structuredClone(this.state);
      const result = fn(draft);
      if (this.path) {
        await mkdir(dirname(this.path), { recursive: true });
        await writeFile(`${this.path}.tmp`, JSON.stringify(draft), 'utf8');
        await rename(`${this.path}.tmp`, this.path);
      }
      this.state = draft;
      return result;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
  create(input: IssueInput) {
    return this.mutate((state) => {
      const now = new Date().toISOString();
      const issue = {
        ...input,
        id: randomUUID(),
        key: `SP-${++state.counter}`,
        createdAt: now,
        updatedAt: now,
      };
      state.issues.push(issue);
      return issue;
    });
  }
  update(id: string, input: Partial<IssueInput>) {
    return this.mutate((state) => {
      const issue = state.issues.find((item) => item.id === id);
      if (!issue) throw new NotFound('Issue not found');
      Object.assign(issue, input, { updatedAt: new Date().toISOString() });
      return issue;
    });
  }
  remove(id: string) {
    return this.mutate((state) => {
      const index = state.issues.findIndex((issue) => issue.id === id);
      if (index < 0) throw new NotFound('Issue not found');
      state.issues.splice(index, 1);
      return { deleted: true };
    });
  }
  standup(input: { yesterday: string; today: string; blockers: string }) {
    return this.mutate((state) => {
      const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const entry = { ...input, date, author: 'Dilanka' };
      state.standups = state.standups.filter(
        (item) => item.date !== date || item.author !== entry.author,
      );
      state.standups.push(entry);
      return entry;
    });
  }
}
