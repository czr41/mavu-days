import type { PrismaClient } from '@mavu/db';

/** Prisma `$transaction(fn)` callback parameter when interactive transactions are typed as `unknown`. */
export type InteractiveTxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;
