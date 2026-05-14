import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@mavu/db';
import type { InteractiveTxClient } from '../lib/interactive-tx-client.js';

type MembershipWithOrg = Prisma.MembershipGetPayload<{ include: { organization: true } }>;

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
  organizationSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const body = registerBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const { email, password, organizationName, organizationSlug } = body.data;

    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const slugTaken = await app.prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });
    if (slugTaken) {
      return reply.status(409).send({ error: 'Organization slug taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await app.prisma.$transaction(async (tx: InteractiveTxClient) => {
      const org = await tx.organization.create({
        data: { name: organizationName, slug: organizationSlug },
      });
      const user = await tx.user.create({
        data: { email, passwordHash },
      });
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'OWNER',
        },
      });
      return { user, org };
    });

    const token = await reply.jwtSign({
      sub: result.user.id,
      email: result.user.email,
    });

    return reply.send({
      token,
      user: { id: result.user.id, email: result.user.email },
      organization: { id: result.org.id, slug: result.org.slug, name: result.org.name },
    });
  });

  app.post('/auth/login', async (req, reply) => {
    const body = loginBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }

    const user = await app.prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(body.data.password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return reply.send({ token, user: { id: user.id, email: user.email } });
  });

  app.post('/invites/:token/accept', async (req, reply) => {
    const inviteToken = (req.params as { token: string }).token;
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const invite = await app.prisma.invite.findUnique({ where: { token: inviteToken } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired invite' });
    }
    if (invite.email.toLowerCase() !== body.data.email.toLowerCase()) {
      return reply.status(400).send({ error: 'Invite email mismatch' });
    }

    try {
      const signedUser = await app.prisma.$transaction(async (tx: InteractiveTxClient) => {
        const passwordHash = await bcrypt.hash(body.data.password, 12);
        const email = invite.email.toLowerCase();
        const userRecord = await tx.user.findUnique({ where: { email } });
        const user =
          userRecord !== null
            ? await tx.user.update({
                where: { id: userRecord.id },
                data: { passwordHash },
                select: { id: true, email: true },
              })
            : await tx.user.create({
                data: { email, passwordHash },
                select: { id: true, email: true },
              });

        const already = await tx.membership.findUnique({
          where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
        });
        if (already) {
          throw new Error('already');
        }

        await tx.membership.create({
          data: { userId: user.id, organizationId: invite.organizationId, role: invite.role },
        });

        await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

        return user;
      });

      const tokenJwt = await reply.jwtSign({ sub: signedUser.id, email: signedUser.email });
      return reply.send({
        token: tokenJwt,
        user: { id: signedUser.id, email: signedUser.email },
      });
    } catch {
      return reply.status(409).send({ error: 'Could not accept invite — are you already a member?' });
    }
  });

  app.get('/me', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const payload = req.user;
    const memberships = await app.prisma.membership.findMany({
      where: { userId: payload.sub },
      include: { organization: true },
    });

    return reply.send({
      user: { id: payload.sub, email: payload.email },
      organizations: memberships.map((m: MembershipWithOrg) => ({
        id: m.organizationId,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  });
}
