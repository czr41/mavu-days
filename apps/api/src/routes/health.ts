import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance) {
  /** Cheap check that the HTTP server is running (no DB). */
  app.get('/health/live', async () => ({ ok: true, service: 'mavu-api' }));

  app.get('/health', async () => {
    await app.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: 'mavu-api' };
  });
}
