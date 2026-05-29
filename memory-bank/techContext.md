# Technical context

## Stack

- **Runtime:** Node 20+, npm workspaces monorepo
- **API:** Fastify 5, `@fastify/jwt`, Prisma client, Zod
- **Web:** Next.js 15 (App Router), React 19
- **DB:** PostgreSQL via Prisma (`DATABASE_URL` pooled + `DIRECT_URL` for migrations — Supabase-compatible)

## Commands (abbrev.)

- Dev API+web: `npm run dev`
- Build all: `npm run build`
- Migrate (hosted CI): `npm run migrate:deploy:ci -w @mavu/db`
- CI (GitHub): `.github/workflows/ci.yml`; **API VM deploy:** `.github/workflows/deploy-api.yml` (needs repo secrets)

## Production hosting (Oracle VM)

- **VM public IPv4:** `68.233.98.160` (A record target for API DNS).
- **Production API origin (browser / Vercel):** `https://api.mavudays.com` — set as **`NEXT_PUBLIC_API_URL`** (no trailing slash). TLS is terminated by **Caddy** on the VM; Fastify stays on **127.0.0.1:3001** (or similar) behind the proxy.

## API ↔ Web contract

Browser calls **`NEXT_PUBLIC_API_URL`** for `/orgs/...`, `/public/...`, `/feeds/...` is served by API host.

## Fetch typing note

`packages/channels-ical` and API Airbnb scrape helper use a small **`globalFetch()`** wrapper so TypeScript stays happy without DOM `lib` on Node.
