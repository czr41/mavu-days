import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@mavu/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin: FastifyPluginAsync = fp(async (app) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  await prisma.$connect();
  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
