import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync } from 'fastify';

export type JwtUser = {
  sub: string;
  email: string;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export const jwtPlugin: FastifyPluginAsync = fp(async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  await app.register(jwt, {
    secret,
    sign: { expiresIn: '7d' },
  });
});
