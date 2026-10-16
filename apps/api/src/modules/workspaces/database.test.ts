import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../lib/database.js';
import { WorkspaceService } from './service.js';
import { issueInput } from '@sprintpilot/shared';
import { buildApp } from '../../app.js';
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('PostgreSQL workspace isolation', () => {
  const db = url ? createDatabase(url) : undefined;
  const service = db ? new WorkspaceService(db) : undefined;
  const runId = randomUUID();
  const workspaceIds: string[] = [];
  const userIds: string[] = [];
  afterAll(async () => {
    if (!db) return;
    await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });
  it('keeps issue numbers unique, data durable, and workspace access isolated', async () => {
    const owner = await service!.user({
      uid: `test-${runId}-owner`,
      email: 'owner@example.test',
    });
    userIds.push(owner.id);
    const stranger = await service!.user({
      uid: `test-${runId}-stranger`,
      email: 'stranger@example.test',
    });
    userIds.push(stranger.id);
    const first = await service!.create(owner.id, {
      name: 'Test workspace',
      key: 'SP',
    });
    workspaceIds.push(first.id);
    const second = await service!.create(owner.id, {
      name: 'Other workspace',
      key: 'OT',
    });
    workspaceIds.push(second.id);
    expect((await service!.detail(owner.id, first.id)).members[0].role).toBe(
      'OWNER',
    );
    expect(await service!.list(stranger.id)).toEqual([]);
    await expect(service!.issues(stranger.id, first.id)).rejects.toMatchObject({
      statusCode: 403,
    });
    const input = issueInput
      .omit({ assignee: true })
      .parse({ title: 'Concurrent issue', points: 8, label: 'Experience' });
    const issues = await Promise.all(
      Array.from({ length: 12 }, () =>
        service!.createIssue(owner.id, first.id, input),
      ),
    );
    expect(new Set(issues.map((issue) => issue.key)).size).toBe(12);
    expect(
      (await service!.issues(owner.id, first.id)).map((issue) => issue.key),
    ).toEqual(Array.from({ length: 12 }, (_, i) => `SP-${i + 1}`));
    await service!.updateIssue(owner.id, first.id, issues[0].id, {
      status: 'DONE',
    });
    expect(
      (await service!.issues(owner.id, first.id)).find(
        (issue) => issue.id === issues[0].id,
      ),
    ).toMatchObject({ status: 'DONE', points: 8, label: 'Experience' });
    await expect(
      service!.updateIssue(owner.id, second.id, issues[0].id, {
        title: 'Cross-workspace edit',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      service!.deleteIssue(stranger.id, first.id, issues[0].id),
    ).rejects.toMatchObject({ statusCode: 403 });
    const reopened = createDatabase(url!);
    try {
      expect(
        await new WorkspaceService(reopened).issues(owner.id, first.id),
      ).toHaveLength(12);
    } finally {
      await reopened.$disconnect();
    }
    const app = await buildApp({
      workspaces: {
        service: service!,
        verify: async () => ({
          uid: `test-${runId}-owner`,
          email: owner.email,
        }),
      },
    });
    try {
      expect(
        (
          await app.inject({
            url: `/api/workspaces/${first.id}/issues`,
            headers: { authorization: 'Bearer test-token' },
          })
        ).statusCode,
      ).toBe(200);
      const created = await app.inject({
        method: 'POST',
        url: `/api/workspaces/${first.id}/issues`,
        headers: { authorization: 'Bearer test-token' },
        payload: { title: 'Created through authenticated API' },
      });
      expect(created.statusCode).toBe(201);
      expect(created.json().key).toBe('SP-13');
    } finally {
      await app.close();
    }
    await service!.deleteIssue(owner.id, first.id, issues[0].id);
    expect(await service!.issues(owner.id, first.id)).toHaveLength(12);
  }, 30_000);
});
