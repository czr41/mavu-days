# Deploying Mavu Days to Google Cloud (sketch)

This is a pragmatic cutover checklist for moving from Docker Compose locally to GCP. Tune instance sizes for your traffic.

## Services

| Local (Compose) | GCP target                         |
|-----------------|------------------------------------|
| PostgreSQL      | Cloud SQL for PostgreSQL           |
| Redis           | Memorystore for Redis               |
| MinIO (S3 API)  | Cloud Storage buckets (S3-compat) |
| API + Worker    | Cloud Run services (multiple)     |

## Steps

1. **Cloud SQL**: create Postgres 16 instance; create database + user; set `DATABASE_URL` secret.
2. **Memorystore**: create Redis; set `REDIS_URL` for the worker service (VPC connector if required).
3. **GCS bucket**: media + optional static assets; reuse S3-compatible env vars pointing at `https://storage.googleapis.com` style endpoint with HMAC keys.
4. **Secrets**: store `JWT_SECRET`, SMTP creds, payment provider keys in Secret Manager; mount as env on Cloud Run.
5. **Migrations**: run `prisma migrate deploy` from CI or a one-off Cloud Run Job using the same image as the API.
6. **API Cloud Run**: build container from `apps/api` (multi-stage: install → build → `node dist/index.js`). Set min instances if you need warm latency.
7. **Worker Cloud Run**: separate service from `apps/api` with command `node dist/worker.js` (or compiled path). Shares image, different CMD. Same `DATABASE_URL` + `REDIS_URL`.
8. **Scheduler**: Cloud Scheduler HTTP POST hitting an internal cron endpoint OR rely solely on BullMQ repeat jobs if worker always on.
9. **Web**: Vercel/Cloud Run Hosting for Next.js; set `NEXT_PUBLIC_API_URL` to the API URL.

## Notes

- For **iCal ingestion**, outbound feeds must use a publicly reachable HTTPS URL for Airbnb/Booking to fetch.
- Rotate **SMTP** passwords as secrets; WhatsApp / Instagram integrations stay behind `FEATURE_PHASE2_MESSAGES`.
