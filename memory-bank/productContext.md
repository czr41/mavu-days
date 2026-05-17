# Product context

## Audience

Hosts/operators managing properties, units, listings, bookings, CMS-like landing content, and **OTA calendar sync** (Airbnb-style inbound `.ics`, outbound feed URLs for Airbnb to import).

## Key UX flows

- **Public:** Landing + stay detail routes; availability/booking touches API **`NEXT_PUBLIC_API_URL`** (must be Fastify base, not marketing domain).
- **Admin:** Tabs for overview, properties, bookings, reviews, CMS, **Channels & iCal**, team.
- **Channels:** Calendar URLs belong under **Connect channel / add iCal feed** → unit → **Inbound iCal URL**. **Airbnb profiles** are optional grouping labels only—not where `.ics` links go.
- **Airbnb extras:** Listing profile fields + optional photo scrape + stay gallery URLs + inline calendar shortcuts live under **CMS → Stay listings** (see schema/API).

## Env hints

See root **`.env.example`**. Supabase supplies **Postgres URLs only**; this app does **not** use Supabase JS client for core flows (Prisma owns DB access).
