# Deploy: Vercel (Next.js) + Supabase (Postgres)

Low-cost path: **marketing site on Vercel**, **database on Supabase**, **Fastify API on a Node host** you control (Oracle Ampere VM, Railway, Render, Fly, …). This repo does **not** put the API on Vercel unless you add that separately.

For **AI-assisted Supabase** in Cursor, configure **[`.cursor/mcp.json`](../../.cursor/mcp.json)** (replace `YOUR_SUPABASE_PROJECT_REF` with your project ref from the Supabase dashboard URL or **Connect → MCP**), reload MCP in Cursor, and complete any browser login Supabase prompts for. Optional: `npx skills add supabase/agent-skills` for extra Supabase-focused agent context.

## 1. Stack (what this codebase uses)

| Layer | Technology |
| ----- | ---------- |
| Database access | **Prisma** (`packages/db`) → PostgreSQL. **No** Supabase JS client for DB. |
| Marketing UI | **Next.js 15** (`apps/web`) |
| Backend | **Fastify** (`apps/api`) |
| Redis | **Optional** — only the BullMQ **worker** (`apps/api/src/worker.ts`) needs `REDIS_URL`. Main API and login work without Redis. |

## 2. Supabase: what to copy

| Supabase dashboard item | Needed here? |
| ----------------------- | ------------ |
| **Project URL** (`https://xxx.supabase.co`) | **No** — not used by Prisma-only access. |
| **anon / publishable key** | **No** |
| **service_role key** | **No** (no server-side Supabase admin SDK in this repo) |
| **Database password** | **Yes** — embedded in connection strings |
| **Transaction pooler** URI (port **6543**, `?pgbouncer=true`) | Set as **`DATABASE_URL`** on the API host |
| **Direct** DB URI (port **5432**, host like `db.[ref].supabase.co`) | Set as **`DIRECT_URL`** everywhere you run Prisma CLI (`migrate`, `db seed`) and on the API host |

Prisma docs recommend **`pgbouncer=true`** on the pooled URL. Use **IPv4 add-on** or compatible pooler host if your API host cannot reach IPv6-only URLs.

## 3. Environment variables

See root **[`.env.example`](../../.env.example)**. Minimum:

**API host (Oracle VM / Railway / Render / Fly / etc.)**

- `DATABASE_URL` — Supabase **pooled** URL
- `DIRECT_URL` — Supabase **direct** URL (Prisma uses this for migrations engine internals where applicable)
- `JWT_SECRET` — ≥ 32 characters, random
- `NODE_ENV=production`
- Omit `REDIS_URL` until you run the worker

**Vercel (Next.js — `apps/web`)**

Only **`NEXT_PUBLIC_*`** are required for the site to talk to your deployed API:

- `NEXT_PUBLIC_API_URL` — `https://your-api-host` (no trailing slash)
- `NEXT_PUBLIC_ORG_SLUG`
- `NEXT_PUBLIC_SITE_URL` — `https://your-vercel-domain`

Optional: `NEXT_PUBLIC_WHATSAPP_PHONE`, `NEXT_PUBLIC_BOOKING_EMAIL`

You do **not** need `DATABASE_URL` on Vercel for the current web code (no Prisma in `apps/web`). `npm ci` still runs `postinstall`, which generates Prisma with **placeholder** URLs if real env vars are missing.

## 4. Vercel project settings

| Setting | Value |
| ------- | ----- |
| Framework preset | **Next.js** |
| Root Directory | **`apps/web`** |
| Install Command | *(from [`apps/web/vercel.json`](../../apps/web/vercel.json))* `cd ../.. && npm ci` |
| Build Command | `cd ../.. && npm run build -w @mavu/web` |
| Output | Default Next.js (no manual `outputDirectory`) |

## 5. One-time: migrations against Supabase

From any machine with Node, after `npm ci`, with **real** URLs:

```bash
export DATABASE_URL="postgresql://...pooler...6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://...5432/postgres"
npm run migrate:deploy:ci -w @mavu/db
```

Then register org + seed (see root README), pointing curl/scripts at your **deployed API** URL.

## 6. Redis (when needed)

**Why:** Background **iCal** polling uses BullMQ **only** in `npm run worker -w @mavu/api`. Without Redis, skip the worker; core bookings and admin still work.

**Free/low-cost Redis:** [Upstash](https://upstash.com) serverless Redis — set `REDIS_URL`, deploy worker as second process on same platform as API.

## 7. Checklist

### Locally

1. `npm ci`
2. Copy `.env.example` → `.env`; set `DATABASE_URL`, **`DIRECT_URL`** (same as `DATABASE_URL` for plain local Postgres), `JWT_SECRET`, `NEXT_PUBLIC_*`.
3. `npm run compose:up` (Postgres + MinIO; Redis **not** started by default).
4. `npm run db:migrate -w @mavu/db`
5. `npm run dev` — API :3001, Web :3000
6. Optional worker: `docker compose --profile worker up -d` then `REDIS_URL=redis://localhost:6379 npm run worker -w @mavu/api`

### GitHub

Push as usual; ensure `.env` is **never** committed.

### Vercel

1. New project → import repo.
2. Root Directory **`apps/web`** (install/build pick up [`vercel.json`](../../apps/web/vercel.json)).
3. Add **`NEXT_PUBLIC_*`** env vars above.
4. Deploy.

### API host

1. Connect repo; root or Dockerfile build **`npm run build:api`**; start **`node apps/api/dist/index.js`**.
2. Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`.
3. Run migrations (step 5) once.

#### Oracle Cloud Ampere VM (API only)

Use this when you already have a small **OCI** instance and want **no extra PaaS bill** for the API.

1. **VM:** Ubuntu **ARM64** on Ampere; open **22** (SSH), **80** / **443** (HTTPS). Point your DNS **A** record at the instance public IP.
2. **Node:** Install **Node.js 20+**, `git`, optionally **Caddy** or **nginx + certbot** for TLS on **443** → reverse-proxy to the API (e.g. `127.0.0.1:3001`).
3. **Deploy:** Clone repo on the VM → `npm ci` → `npm run build:api` → run **`node apps/api/dist/index.js`** under **systemd** or **pm2** with the same env vars as above (`PORT` if the platform sets it; otherwise bind `3001` internally and proxy from 443).
4. **Build stack:** The API needs compiled workspaces (`build:api`); keep **1 GB RAM** in mind — if `npm ci` OOMs, add **swap** or build on a larger machine / CI and rsync **`apps/api/dist`** + **`node_modules`** (or ship a Docker image).
5. **Migrations:** Run **`npm run migrate:deploy:ci -w @mavu/db`** once from the VM (or your laptop) with **`DATABASE_URL`** + **`DIRECT_URL`** pointing at Supabase — **not** from Vercel.

Keep **Postgres on Supabase** unless you intentionally self-host Postgres on OCI (more ops); this doc assumes **Supabase + API on OCI + Next on Vercel**.

### After deployment

- Open site → listings/load calls succeed (browser network tab → API domain).
- Health: API route if exposed (see `apps/api/src/routes/health.ts`).
- CORS: API uses permissive origin for browser calls.

