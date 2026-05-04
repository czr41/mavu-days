import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { syncAllInboundIcals } from './services/ical-sync.js';
import { createPublisherFromEnv } from './notifications/publisher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error(
    'REDIS_URL is required for the worker/BullMQ. Start docker compose Redis or export REDIS_URL.',
  );
  process.exit(1);
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const notify = createPublisherFromEnv(process.env);

const queueName = 'mavu-ical';

const queue = new Queue(queueName, { connection });

const worker = new Worker(
  queueName,
  async () => {
    const result = await syncAllInboundIcals(prisma, notify);
    console.log('[ical-worker]', JSON.stringify(result));
  },
  { connection },
);

await prisma.$connect();

await queue.add(
  'poll',
  {},
  {
    jobId: 'ical-periodic-root',
    repeat: { every: 15 * 60 * 1000 },
    removeOnComplete: true,
  },
);

console.log('Mavu iCal worker started (15m repeatable job).');

const shutdown = async () => {
  await worker.close();
  await queue.close();
  await prisma.$disconnect();
  await connection.quit();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
