# Mavu Days — local development

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres, Redis, MinIO)

## First run

1. Copy environment: `Copy-Item .env.example .env` (or duplicate manually). Ensure `JWT_SECRET` is at least 32 characters.
2. Start services: `npm run compose:up` (requires Docker running).
3. Apply DB schema: `npm run db:migrate -w @mavu/db` (uses root `.env` via `dotenv-cli`).
4. Dev servers: `npm run dev`  
   - API: [http://localhost:3001](http://localhost:3001)  
   - Web: [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run compose:down` | Stop Docker services |
| `npm run build` | Production build all workspaces |
| `npm run worker -w @mavu/api` | BullMQ worker for iCal polling (needs `REDIS_URL`) |
| `npm test` | `channels-ical` Vitest golden tests |
| `npm run db:generate -w @mavu/db` | Regenerate Prisma client |
| `npm run lint` | ESLint api + lint web |

### Bootstrap tenant (curl)

Register first org + owner:

```bash
curl -X POST http://localhost:3001/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"you@example.com\",\"password\":\"yourpassword\",\"organizationName\":\"Mavu Days\",\"organizationSlug\":\"mavu-days\"}"
```

Then `GET /me` with `Authorization: Bearer <token>`.

Set `MOCK_PAYMENTS=true` in `.env` to auto-confirm direct-site bookings in dev.

### Key routes

- Tenant ops: `/orgs/:orgSlug/...` (properties, units, listing links with inbound iCal, bookings, CMS, conflicts)
- Public site: `/public/orgs/:orgSlug/inventory` · `POST /public/orgs/:orgSlug/bookings`
- ICS export: `/feeds/<outbound-feed-slug>.ics` (paste URL into Airbnb/Booking)
- Webhooks (Phase 2): `/hooks/meta/whatsapp` · `/hooks/meta/instagram` (`FEATURE_PHASE2_MESSAGES`)

See [docs/deploy/gcp-sketch.md](docs/deploy/gcp-sketch.md) for GCP cutover outline.

## Layout

- `apps/api` — Fastify API, JWT auth, Prisma
- `apps/web` — Next.js marketing shell + health check to API
- `packages/db` — Prisma schema & migrations
- `packages/contracts` — shared integration interfaces (`ChannelConnector`)
- `packages/channels-ical` — iCal fetch / parse / outbound ICS + golden tests
