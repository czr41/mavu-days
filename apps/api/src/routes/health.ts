import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await app.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: 'mavu-api' };
  });
}
