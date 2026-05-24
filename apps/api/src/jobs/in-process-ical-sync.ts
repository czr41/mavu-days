import type { FastifyInstance } from 'fastify';
import { syncAllInboundIcals } from '../services/ical-sync.js';

/**
 * Periodically pull all inbound iCal feeds (Airbnb/Booking export URLs) into mirror bookings.
 * Use this on single-node API deployments without the BullMQ worker (`apps/api/src/worker.ts`).
 *
 * Set `ICAL_SYNC_INTERVAL_MS=0` to disable. Default 15 minutes.
 */
export function scheduleInProcessIcalSync(app: FastifyInstance, intervalMs: number): void {
  if (intervalMs <= 0) {
    app.log.info('In-process iCal sync disabled (ICAL_SYNC_INTERVAL_MS=0).');
    return;
  }

  const run = async () => {
    try {
      const result = await syncAllInboundIcals(app.prisma, app.notify);
      app.log.info({ msg: 'ical-periodic-sync', ...result });
    } catch (err) {
      app.log.error({ err, msg: 'ical-periodic-sync-failed' });
    }
  };

  const id = setInterval(() => {
    void run();
  }, intervalMs);

  app.addHook('onClose', () => {
    clearInterval(id);
  });

  // Stagger first pull so startup + migrations are not competing with the first fetch burst.
  setTimeout(() => {
    void run();
  }, 15_000);

  app.log.info(`In-process iCal sync every ${Math.round(intervalMs / 1000)}s (set ICAL_SYNC_INTERVAL_MS=0 to disable).`);
}
