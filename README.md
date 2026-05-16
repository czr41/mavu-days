# Mavu Days -- local development

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres, MinIO; Redis only with `docker compose --profile worker up` for the iCal worker) -- **optional** if you use [hosted Postgres + cloud API](docs/deploy/cloud-lite.md) instead

## First run

1. Copy environment: `Copy-Item .env.example .env` (or duplicate manually). Ensure `JWT_SECRET` is at least 32 characters.
2. Start services: `npm run compose:up` (requires Docker running).
3. Apply DB schema: `npm run db:migrate -w @mavu/db` (uses root `.env` via `dotenv-cli`). Set **`DIRECT_URL`** to the same value as `DATABASE_URL` for local Compose Postgres; use Supabase **direct** URL when hosted.
4. Bootstrap tenant (see curl below), then seed canonical inventory: `npm run db:seed` -- creates property **mavu-farm** with units **full-farm**, **1bhk-villa**, **2bhk-villa** for org slug **mavu-days** (override with `SEED_ORG_SLUG` / `SEED_PROPERTY_SLUG` in `.env`).
5. Dev servers: `npm run dev`  
   - API: [http://localhost:3001](http://localhost:3001)  
   - Web: [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run compose:down` | Stop Docker services |
| `npm run build` | Production build all workspaces |
| `npm run worker -w @mavu/api` | BullMQ worker for iCal (needs `REDIS_URL`; Redis: `docker compose --profile worker up -d`) |
| `npm test` | `channels-ical` Vitest golden tests |
| `npm run db:generate -w @mavu/db` | Regenerate Prisma client |
| `npm run lint` | ESLint api + lint web |
| `npm run db:seed` | Upsert default farm + 3 SKUs for registered org (see step 4) |
| `npm run migrate:deploy:ci -w @mavu/db` | Apply migrations using `DATABASE_URL` + **`DIRECT_URL`** (hosted Supabase / CI; no root `.env` required) |

### Bootstrap tenant (curl)

Register first org + owner:

```bash
curl -X POST http://localhost:3001/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"you@example.com\",\"password\":\"yourpassword\",\"organizationName\":\"Mavu Days\",\"organizationSlug\":\"mavu-days\"}"
```

Then `GET /me` with `Authorization: Bearer <token>`.

Run `npm run db:seed` so admin inventory matches the marketing site: three rentable units whose slugs resolve to Full Farm / 1BHK / 2BHK for availability search (`landing-availability-matrix.ts`). Stay **cards** and **copy** on the homepage still come from `apps/web/lib/landing-content.ts` + CMS sections until wired to the API.

Set `MOCK_PAYMENTS=true` in `.env` to auto-confirm direct-site bookings in dev.

### Key routes

- Tenant ops: `/orgs/:orgSlug/...` (properties, units, listing links with inbound iCal, bookings, CMS, conflicts)
- Public site: `/public/orgs/:orgSlug/inventory` · `POST /public/orgs/:orgSlug/bookings`
- ICS export: `/feeds/<outbound-feed-slug>.ics` (paste URL into Airbnb/Booking — they pull your busy dates)
- Inbound iCal: worker (`npm run worker -w @mavu/api`, needs `REDIS_URL`) polls every ~15m; stale remote events cancel mirror bookings here
- Manual pull: `POST /orgs/:orgSlug/channels/sync-ical` (admin JWT) — same logic as the worker for one org
- Webhooks (Phase 2): `/hooks/meta/whatsapp` · `/hooks/meta/instagram` (`FEATURE_PHASE2_MESSAGES`)

- **Vercel + Supabase:** [docs/deploy/vercel-supabase.md](docs/deploy/vercel-supabase.md).
- **API on Oracle VM + web on Vercel:** [docs/deploy/oracle-api-vercel-web.md](docs/deploy/oracle-api-vercel-web.md).
- **Cursor AI + Supabase:** edit `.cursor/mcp.json` (replace `YOUR_SUPABASE_PROJECT_REF`), then reload MCP in Cursor; see top of [vercel-supabase.md](docs/deploy/vercel-supabase.md).
- **No Docker / low disk:** [docs/deploy/cloud-lite.md](docs/deploy/cloud-lite.md) (Neon + hosted API + Vercel).
- **GCP-oriented layout:** [docs/deploy/gcp-sketch.md](docs/deploy/gcp-sketch.md).

## Layout

- `apps/api` -- Fastify API, JWT auth, Prisma
- `apps/web` -- Next.js marketing shell + health check to API
- `packages/db` -- Prisma schema & migrations
- `packages/contracts` -- shared integration interfaces (`ChannelConnector`)
- `packages/channels-ical` -- iCal fetch / parse / outbound ICS + golden tests
