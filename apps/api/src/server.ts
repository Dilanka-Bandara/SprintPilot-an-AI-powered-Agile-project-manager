import { resolve } from 'node:path';
import { z } from 'zod';
import { buildApp } from './app.js';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './lib/database.js';
import { WorkspaceService } from './modules/workspaces/service.js';
import { firebaseVerifier } from './modules/auth/firebase.js';
loadEnv({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});
const config = z
  .object({
    NODE_ENV: z.enum(['development', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DEMO_DATA_PATH: z.string().default('../../.data/demo.json'),
    WORKSPACES_ENABLED: z.enum(['true', 'false']).default('false'),
    DATABASE_URL: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
  })
  .parse(process.env);
if (
  config.WORKSPACES_ENABLED === 'true' &&
  (!config.DATABASE_URL || !config.FIREBASE_PROJECT_ID)
)
  throw new Error('Workspaces require DATABASE_URL and FIREBASE_PROJECT_ID.');
const db =
  config.WORKSPACES_ENABLED === 'true'
    ? createDatabase(config.DATABASE_URL!)
    : undefined;
if (db) await db.$connect();
// The unauthenticated demo still exists, so the server remains loopback-only.
const app = await buildApp({
  dataPath: resolve(config.DEMO_DATA_PATH),
  logger: true,
  workspaces: db
    ? {
        service: new WorkspaceService(db),
        verify: firebaseVerifier(config.FIREBASE_PROJECT_ID!),
      }
    : undefined,
});
if (db)
  app.addHook('onClose', async () => {
    await db.$disconnect();
  });
await app.listen({ port: config.PORT, host: '127.0.0.1' });
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void app.close();
  });
