import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  issueInput,
  issuePatch,
  issueSchema,
  standupInput,
  standupSchema,
  stateSchema,
} from '@sprintpilot/shared';
import type { DemoService } from './service.js';
export async function demoRoutes(app: FastifyInstance, service: DemoService) {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const params = z.object({ id: z.string().uuid() });
  api.get(
    '/api/demo',
    { schema: { response: { 200: stateSchema } } },
    async () => service.snapshot(),
  );
  api.post(
    '/api/demo/issues',
    { schema: { body: issueInput, response: { 201: issueSchema } } },
    async (request, reply) =>
      reply.code(201).send(await service.create(request.body)),
  );
  api.patch(
    '/api/demo/issues/:id',
    {
      schema: {
        params,
        body: issuePatch,
        response: { 200: issueSchema },
      },
    },
    async (request) => service.update(request.params.id, request.body),
  );
  api.delete(
    '/api/demo/issues/:id',
    {
      schema: { params, response: { 200: z.object({ deleted: z.boolean() }) } },
    },
    async (request) => service.remove(request.params.id),
  );
  api.put(
    '/api/demo/standups/today',
    { schema: { body: standupInput, response: { 200: standupSchema } } },
    async (request) => service.standup(request.body),
  );
}
