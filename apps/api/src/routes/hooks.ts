import type { FastifyInstance } from 'fastify';

export function registerHooksRoutes(app: FastifyInstance) {
  app.post('/hooks/meta/whatsapp', async (req, reply) => {
    if (process.env.FEATURE_PHASE2_MESSAGES !== 'true' && process.env.FEATURE_PHASE2_MESSAGES !== '1') {
      return reply.status(503).send({
        disabled: true,
        message:
          'WhatsApp ingestion is deferred to Phase 2. Set FEATURE_PHASE2_MESSAGES=true once Meta app credentials exist.',
      });
    }
    return reply.send({ stub: true, received: !!(req.body as object) });
  });

  app.post('/hooks/meta/instagram', async (req, reply) => {
    if (process.env.FEATURE_PHASE2_MESSAGES !== 'true' && process.env.FEATURE_PHASE2_MESSAGES !== '1') {
      return reply.status(503).send({
        disabled: true,
        message:
          'Instagram messaging is deferred to Phase 2. Set FEATURE_PHASE2_MESSAGES=true once Graph API hooks are configured.',
      });
    }
    return reply.send({ stub: true, received: !!(req.body as object) });
  });
}
