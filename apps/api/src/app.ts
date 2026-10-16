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
export async function buildApp(
  options: { dataPath?: string; logger?: boolean } = {},
) {
  const app = Fastify({
    logger: options.logger
      ? { redact: ['req.headers.authorization', 'req.headers.cookie'] }
      : false,
    bodyLimit: 32_768,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cors, { origin: 'http://127.0.0.1:5173' });
  await app.register(helmet);
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });
  await app.register(swagger, {
    openapi: {
      info: { title: 'SprintPilot local demo API', version: '0.1.0' },
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
    reply.status(status).send({
      error: {
        code:
          status === 404
            ? 'ISSUE_NOT_FOUND'
            : status === 400
              ? 'VALIDATION_ERROR'
              : status === 429
                ? 'RATE_LIMITED'
                : 'INTERNAL_ERROR',
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
  return app;
}
