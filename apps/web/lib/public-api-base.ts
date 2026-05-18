/** Browser + server fetch base for Fastify public routes; trims and strips trailing slashes. */
export function publicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const base = trimmed.replace(/\/+$/, '');
  return base.length > 0 ? base : 'http://localhost:3001';
}
