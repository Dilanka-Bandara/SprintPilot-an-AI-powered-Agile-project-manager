import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import type { WorkspaceService } from './service.js';
import { ApiError } from '../../lib/errors.js';
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
const user = {
  id: 'de647251-f680-4be7-8e85-9b894dd1f5c5',
  email: 'owner@example.test',
  name: 'Owner',
};
async function setup() {
  const service = {
    user: vi.fn().mockResolvedValue(user),
    list: vi.fn().mockResolvedValue([]),
    detail: vi
      .fn()
      .mockRejectedValue(
        new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a member'),
      ),
  };
  const verify = vi.fn(async (token: string) => {
    if (token !== 'valid') throw new Error('invalid signature');
    return { uid: 'firebase-owner', email: user.email, name: user.name };
  });
  const app = await buildApp({
    workspaces: { service: service as unknown as WorkspaceService, verify },
  });
  apps.push(app);
  return { app, service, verify };
}
describe('workspace authentication boundary', () => {
  it('rejects missing tokens before reading the database', async () => {
    const { app, service, verify } = await setup();
    const response = await app.inject('/api/workspaces');
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
    expect(verify).not.toHaveBeenCalled();
    expect(service.user).not.toHaveBeenCalled();
  });
  it('rejects invalid tokens before reading the database', async () => {
    const { app, service } = await setup();
    const response = await app.inject({
      url: '/api/workspaces',
      headers: { authorization: 'Bearer forged' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_TOKEN');
    expect(service.user).not.toHaveBeenCalled();
  });
  it('returns the verified user without internal identity fields', async () => {
    const { app } = await setup();
    const response = await app.inject({
      url: '/api/me',
      headers: { authorization: 'Bearer valid' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(user);
  });
  it('returns 403 for a non-member', async () => {
    const { app } = await setup();
    const response = await app.inject({
      url: `/api/workspaces/${user.id}`,
      headers: { authorization: 'Bearer valid' },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('WORKSPACE_FORBIDDEN');
  });
  it('rejects invalid workspace names and keys', async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: { authorization: 'Bearer valid' },
      payload: { name: '', key: 'x' },
    });
    expect(response.statusCode).toBe(400);
  });
  it('does not mislabel database failures as token failures', async () => {
    const { app, service } = await setup();
    service.user.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await app.inject({
      url: '/api/me',
      headers: { authorization: 'Bearer valid' },
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.message).not.toContain('database');
  });
});
