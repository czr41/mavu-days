import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadEnv } from './config/env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { jwtPlugin } from './plugins/jwt.js';
import { notifyPlugin } from './plugins/notify.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerFeedsRoutes } from './routes/feeds.js';
import { registerPublicRoutes } from './routes/public.js';
import { registerHooksRoutes } from './routes/hooks.js';
import { registerOrganizationRoutes } from './routes/organization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const env = loadEnv();

const app = Fastify({
  logger: env.NODE_ENV === 'development',
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(jwtPlugin);
await app.register(prismaPlugin);
await app.register(notifyPlugin);

registerHealthRoutes(app);
registerAuthRoutes(app);
registerFeedsRoutes(app);
registerPublicRoutes(app);
registerHooksRoutes(app);
registerOrganizationRoutes(app);

const address = await app.listen({ host: env.API_HOST, port: env.API_PORT });
app.log.info(`Listening on ${address}`);
