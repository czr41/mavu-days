# Run Mavu Days in the cloud (no local Docker)

Use this when your laptop is tight on disk or you do not want Docker Desktop. You run **Postgres and the API on managed services**, and the **Next.js site on Vercel** (or similar). Builds happen in the cloud; your machine only needs Git + Node for occasional commands.

## Architecture

| Piece | Local Docker | Cloud alternative |
|-------|----------------|-------------------|
| Postgres | `docker compose` | [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway Postgres](https://railway.app), etc. |
| Redis | compose | Optional: [Upstash](https://upstash.com) (only needed for the **iCal worker**, not login or the marketing site) |
| MinIO | compose | Optional: AWS S3, Cloudflare R2, GCS — only when you wire file uploads |
| API | `:3001` | [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io), etc. |
| Web | `:3000` | [Vercel](https://vercel.com) (recommended for Next.js) |

## 1) Postgres (Neon example)

1. Create a Neon project and database.
2. Copy the connection string. For Prisma, prefer a URL that includes SSL, e.g. append `?sslmode=require` if the host requires it.
3. Set **`DATABASE_URL`** on the service that runs the API (and use the same value when you run migrations).

## 2) One-time database migrations

From **any** machine with Node (or a CI job), after `npm ci`. Set `DATABASE_URL` in the environment (no root `.env` required):

**Windows (cmd)**

```bat
set DATABASE_URL=postgresql://...your-neon-url...
npm run migrate:deploy:ci -w @mavu/db
```

**Windows (PowerShell)**

```powershell
$env:DATABASE_URL = "postgresql://...your-neon-url..."
npm run migrate:deploy:ci -w @mavu/db
```

**macOS / Linux**

```bash
export DATABASE_URL="postgresql://...your-neon-url..."
npm run migrate:deploy:ci -w @mavu/db
```

For local dev with a root `.env`, you can keep using `npm run db:migrate` / `migrate:deploy` (see root README), which loads `.env` via `dotenv-cli`.

Then register your org and seed data (same as README), pointing at your **hosted** API URL instead of localhost.

## 3) Deploy the API (Railway / Render pattern)

1. Connect the GitHub repo to the platform.
2. **Root directory**: repository root (monorepo).
3. **Build command** (installs all workspaces and compiles the API stack):

   ```bash
   npm ci && npm run build:api
   ```

   (`build:api` is defined in the root `package.json`.)

4. **Start command**:

   ```bash
   node apps/api/dist/index.js
   ```

5. **Environment variables** (minimum):

   | Variable | Notes |
   |----------|--------|
   | `DATABASE_URL` | Neon (or other) Postgres URL |
   | `JWT_SECRET` | Random string, **≥ 32 characters** |
   | `NODE_ENV` | `production` |

   Optional (see `apps/api/src/config/env.ts` and `.env.example`):

   - `REDIS_URL` — only if you run the BullMQ worker for iCal.
   - `S3_*` — only when media upload uses your bucket.
   - `SMTP_*` — outbound email.

The API listens on **`PORT`** when the host sets it (Railway/Render/Fly); otherwise it uses **`API_PORT`** (default `3001`).

6. Note the public API base URL (e.g. `https://mavu-api.up.railway.app`).

## 4) Deploy the web app (Vercel)

1. Import the repo; set the project **root** to **`apps/web`** (or use a monorepo preset and pick `apps/web`).
2. Build: default `next build` is fine.
3. **Environment variables**:

   | Variable | Example |
   |----------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://your-api-host` (no trailing slash) |
   | `NEXT_PUBLIC_ORG_SLUG` | `mavu-days` |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-vercel-domain` |
   | `NEXT_PUBLIC_WHATSAPP_PHONE` | Optional |
   | `NEXT_PUBLIC_BOOKING_EMAIL` | Optional |

4. Redeploy after changing `NEXT_PUBLIC_*` values.

## 5) CORS

The API already enables CORS with `origin: true`, so browser calls from your Vercel domain to the API should work once `NEXT_PUBLIC_API_URL` points at the live API.

## 6) Worker (iCal / BullMQ)

Skip at first to save services and disk. When you need it, add **Upstash Redis**, set **`REDIS_URL`**, deploy a second process running `npm run worker -w @mavu/api` (see root README).

## Cost / footprint

- **Neon** / **Supabase** free tiers are enough for development and light production.
- **Vercel** hobby tier fits the marketing site.
- **Railway / Render** free tiers change over time; check current limits.

For a fuller GCP-oriented layout, see [gcp-sketch.md](./gcp-sketch.md).
