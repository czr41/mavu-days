# Project brief — Mavu Days

## What it is

Multi-tenant–style **farm stay / rentable-unit** platform: marketing site (Next.js), **Fastify API** with JWT, **Prisma → Postgres**. Channels use **inbound/outbound iCal** (`ListingLink`, `@mavu/channels-ical`). Host admin UI under `/admin/[orgSlug]`.

## Repo truth sources

- Day-to-day dev & scripts: root **`README.md`**
- Deploy (Vercel, Supabase, Oracle VM, GitHub Actions API deploy): **`docs/deploy/`**
- Operator infra facts (OCI VM IP, Windows SSH key folder): **`.cursor/oracle-deploy-context.md`**

## Primary workspaces

| Area | Path |
|------|------|
| API | `apps/api` |
| Web | `apps/web` |
| DB / Prisma | `packages/db` |
| iCal package | `packages/channels-ical` |
