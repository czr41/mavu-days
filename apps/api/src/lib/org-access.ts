import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { MembershipRole } from '@prisma/client';

/** Returns false if 401 already sent. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  try {
    await req.jwtVerify();
    return true;
  } catch {
    await reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
}

export async function getMembership(
  app: FastifyInstance,
  userId: string,
  orgSlug: string,
  allowedRoles: MembershipRole[],
) {
  const m = await app.prisma.membership.findFirst({
    where: {
      userId,
      organization: { slug: orgSlug },
      ...(allowedRoles.length > 0 ? { role: { in: allowedRoles } } : {}),
    },
    include: { organization: true },
  });

  return m ?? null;
}
