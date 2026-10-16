import { resolve } from 'node:path';
import { z } from 'zod';
import { buildApp } from './app.js';
const config = z
  .object({
    NODE_ENV: z.enum(['development', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DEMO_DATA_PATH: z.string().default('../../.data/demo.json'),
  })
  .parse(process.env);
// This deliberately unauthenticated demo must not listen on a public interface.
const app = await buildApp({
  dataPath: resolve(config.DEMO_DATA_PATH),
  logger: true,
});
await app.listen({ port: config.PORT, host: '127.0.0.1' });
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void app.close();
  });
