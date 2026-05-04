import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createPublisherFromEnv } from '../notifications/publisher.js';

export const notifyPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('notify', createPublisherFromEnv(process.env));
  await Promise.resolve();
});
