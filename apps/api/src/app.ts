import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DemoService, NotFound } from './modules/demo/service.js';
import { demoRoutes } from './modules/demo/routes.js';
import { ApiError } from './lib/errors.js';
import { workspaceRoutes } from './modules/workspaces/routes.js';
import type { WorkspaceService } from './modules/workspaces/service.js';
import type { VerifyToken } from './modules/auth/firebase.js';
export async function buildApp(
  options: {
    dataPath?: string;
    logger?: boolean;
    workspaces?: { service: WorkspaceService; verify: VerifyToken };
  } = {},
) {
  const app = Fastify({
    logger: options.logger
      ? { redact: ['req.headers.authorization', 'req.headers.cookie'] }
      : false,
    bodyLimit: 32_768,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cors, {
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });
  await app.register(swagger, {
    openapi: {
      info: { title: 'SprintPilot API', version: '0.2.0' },
      components: {
        securitySchemes: {
          firebase: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'Firebase ID token',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUI, { routePrefix: '/docs' });
  app.setErrorHandler((error, request, reply) => {
    const failure = error as FastifyError;
    const status =
      error instanceof NotFound
        ? 404
        : failure.validation
          ? 400
          : (failure.statusCode ?? 500);
    if (status >= 500) request.log.error({ err: error }, 'Request failed');
    const codes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      404: 'ISSUE_NOT_FOUND',
      429: 'RATE_LIMITED',
    };
    reply.status(status).send({
      error: {
        code:
          error instanceof ApiError
            ? error.code
            : (codes[status] ?? 'INTERNAL_ERROR'),
        message:
          status >= 500
            ? 'Something went wrong. Please try again.'
            : failure.message,
      },
    });
  });
  app.setNotFoundHandler((_request, reply) =>
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal('ok'),
            mode: z.literal('local-demo'),
          }),
        },
      },
    },
    async () => ({ status: 'ok', mode: 'local-demo' }),
  );
  await demoRoutes(app, await DemoService.open(options.dataPath));
  if (options.workspaces)
    await workspaceRoutes(
      app,
      options.workspaces.service,
      options.workspaces.verify,
    );
  else
    app.all('/api/workspaces*', async (_request, reply) =>
      reply.code(503).send({
        error: {
          code: 'WORKSPACES_NOT_CONFIGURED',
          message:
            'Workspace storage is not configured. Follow docs/AUTH_SETUP.md.',
        },
      }),
    );
  return app;
}
