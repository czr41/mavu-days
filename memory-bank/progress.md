# Progress / known state

## Implemented (high level)

- Fastify org/public/booking/CMS/channel routes; Prisma schema with listings, listing links, Airbnb host accounts, reviews, etc.
- Next landing + stay detail + org admin UI (Channels tab guidance, Airbnb listing CMS fields, photo scrape helper).
- GitHub Actions: CI on push/PR; optional **`deploy-api.yml`** for Oracle VM.
- Operator notes: **`.cursor/oracle-deploy-context.md`** (SSH key folder + `mavu-farm-server` public IP).

## Operational checklist (outside repo)

- Apply DB migrations where Postgres runs (`prisma migrate deploy`).
- Configure **`NEXT_PUBLIC_API_URL`** on Vercel to Fastify origin.
- GitHub **repository secrets** for API deploy (not Environment secrets unless workflow sets `environment:`).

## Open / verify with operator

- Confirm systemd unit name matches **`mavu-api`** or set **`API_SYSTEMD_UNIT`** secret.
- Confirm **`API_DEPLOY_PATH`** on VM matches git clone root (e.g. `/opt/mavu-days`).
