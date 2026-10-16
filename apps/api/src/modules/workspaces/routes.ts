import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { issueInput, issuePatch, issueSchema } from '@sprintpilot/shared';
import { ApiError } from '../../lib/errors.js';
import { identitySchema, type VerifyToken } from '../auth/firebase.js';
import type { WorkspaceService } from './service.js';
const workspaceInput = z.object({
  name: z.string().trim().min(2).max(80),
  key: z.string().regex(/^[A-Z]{2,5}$/, 'Use 2–5 uppercase letters.'),
});
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.email(),
  name: z.string(),
});
const workspaceSchema = workspaceInput.extend({
  id: z.string().uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});
const params = z.object({ workspaceId: z.string().uuid() });
const issueParams = params.extend({ id: z.string().uuid() });
export async function workspaceRoutes(
  app: FastifyInstance,
  service: WorkspaceService,
  verify: VerifyToken,
) {
  await app.register(async (scoped) => {
    const api = scoped.withTypeProvider<ZodTypeProvider>();
    api.addHook('onRoute', (route) => {
      route.schema = { ...route.schema, security: [{ firebase: [] }] };
    });
    const users = new WeakMap<
      FastifyRequest,
      Awaited<ReturnType<WorkspaceService['user']>>
    >();
    api.addHook('onRequest', async (request) => {
      const bearer = /^Bearer ([^\s]+)$/i.exec(
        request.headers.authorization ?? '',
      );
      if (!bearer)
        throw new ApiError(
          401,
          'UNAUTHENTICATED',
          'Please sign in to continue.',
        );
      let identity;
      try {
        identity = identitySchema.parse(await verify(bearer[1]));
      } catch {
        throw new ApiError(
          401,
          'INVALID_TOKEN',
          'Your session is invalid or expired. Please sign in again.',
        );
      }
      // Database failures are server errors, not evidence that the token is invalid.
      users.set(request, await service.user(identity));
    });
    const user = (request: FastifyRequest) => users.get(request)!;
    api.get(
      '/api/me',
      { schema: { response: { 200: userSchema } } },
      async (request) => user(request),
    );
    api.get(
      '/api/workspaces',
      { schema: { response: { 200: z.array(workspaceSchema) } } },
      async (request) => service.list(user(request).id),
    );
    api.post(
      '/api/workspaces',
      { schema: { body: workspaceInput, response: { 201: workspaceSchema } } },
      async (request, reply) =>
        reply
          .code(201)
          .send(await service.create(user(request).id, request.body)),
    );
    api.get(
      '/api/workspaces/:workspaceId',
      {
        schema: {
          params,
          response: {
            200: workspaceSchema.extend({
              members: z.array(
                z.object({
                  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
                  user: userSchema,
                }),
              ),
            }),
          },
        },
      },
      async (request) =>
        service.detail(user(request).id, request.params.workspaceId),
    );
    api.get(
      '/api/workspaces/:workspaceId/issues',
      { schema: { params, response: { 200: z.array(issueSchema) } } },
      async (request) =>
        service.issues(user(request).id, request.params.workspaceId),
    );
    api.post(
      '/api/workspaces/:workspaceId/issues',
      {
        schema: {
          params,
          body: issueInput.omit({ assignee: true }),
          response: { 201: issueSchema },
        },
      },
      async (request, reply) =>
        reply
          .code(201)
          .send(
            await service.createIssue(
              user(request).id,
              request.params.workspaceId,
              request.body,
            ),
          ),
    );
    api.patch(
      '/api/workspaces/:workspaceId/issues/:id',
      {
        schema: {
          params: issueParams,
          body: issuePatch.omit({ assignee: true }),
          response: { 200: z.object({ updated: z.boolean() }) },
        },
      },
      async (request) =>
        service.updateIssue(
          user(request).id,
          request.params.workspaceId,
          request.params.id,
          request.body,
        ),
    );
    api.delete(
      '/api/workspaces/:workspaceId/issues/:id',
      {
        schema: {
          params: issueParams,
          response: { 200: z.object({ deleted: z.boolean() }) },
        },
      },
      async (request) =>
        service.deleteIssue(
          user(request).id,
          request.params.workspaceId,
          request.params.id,
        ),
    );
  });
}
