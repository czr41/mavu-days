import type { NotificationPublisher } from '../notifications/publisher.js';

declare module 'fastify' {
  interface FastifyInstance {
    notify: NotificationPublisher;
  }
}
