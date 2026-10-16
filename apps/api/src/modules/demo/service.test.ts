import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../../app.js';
import { DemoService } from './service.js';
import { issueInput } from '@sprintpilot/shared';
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function setup() {
  const app = await buildApp();
  apps.push(app);
  return app;
}
describe('local demo API', () => {
  it('preserves points, assignee and every unrelated field when moving an issue', async () => {
    const app = await setup();
    const before = (await app.inject('/api/demo')).json().issues[0];
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/demo/issues/${before.id}`,
      payload: { status: 'IN_PROGRESS' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ...before,
      status: 'IN_PROGRESS',
      updatedAt: expect.any(String),
    });
  });
  it('reports demo health and exposes API docs', async () => {
    const app = await setup();
    expect((await app.inject('/health')).json()).toEqual({
      status: 'ok',
      mode: 'local-demo',
    });
    expect((await app.inject('/docs/json')).statusCode).toBe(200);
  });
  it('rejects invalid input without creating an issue', async () => {
    const app = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/demo/issues',
      payload: { title: ' ', points: -1 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('creates unique keys during concurrent requests', async () => {
    const app = await setup();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/demo/issues',
          payload: { title: `Issue ${i}` },
        }),
      ),
    );
    expect(results.every((r) => r.statusCode === 201)).toBe(true);
    expect(new Set(results.map((r) => r.json().key)).size).toBe(20);
  });
  it('moves, deletes, and returns 404 for a missing issue', async () => {
    const app = await setup();
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/demo/issues',
        payload: { title: 'Ship it' },
      })
    ).json();
    const url = `/api/demo/issues/${created.id}`;
    expect(
      (
        await app.inject({ method: 'PATCH', url, payload: { status: 'DONE' } })
      ).json().status,
    ).toBe('DONE');
    expect((await app.inject({ method: 'DELETE', url })).statusCode).toBe(200);
    expect(
      (await app.inject({ method: 'PATCH', url, payload: { title: 'Gone' } }))
        .statusCode,
    ).toBe(404);
  });
  it('updates the same daily standup rather than duplicating it', async () => {
    const app = await setup();
    for (const today of ['First', 'Updated'])
      await app.inject({
        method: 'PUT',
        url: '/api/demo/standups/today',
        payload: { yesterday: 'Built tests', today },
      });
    const data = (await app.inject('/api/demo')).json();
    expect(data.standups).toHaveLength(1);
    expect(data.standups[0].today).toBe('Updated');
  });
  it('persists changes across service restarts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sprintpilot-'));
    try {
      const path = join(dir, 'demo.json');
      const service = await DemoService.open(path);
      await service.create(issueInput.parse({ title: 'Persistent story' }));
      expect(
        (await DemoService.open(path)).snapshot().issues.at(-1)?.title,
      ).toBe('Persistent story');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
