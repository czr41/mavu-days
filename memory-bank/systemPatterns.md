# System patterns

## Multi-tenant boundary

Data scoped by **`Organization`** / **`organizationId`**. Public routes use **`orgSlug`** in path. Admin JWT carries membership.

## Inventory model

**Property → RentableUnit** (slug unique per property). **`RentableUnitListing`** drives marketing cards/detail when published. **`ListingLink`** ties a unit to a channel (`AIRBNB`, etc.) with **`inboundIcalUrl`** + unique **`outboundFeedSlug`** → **`GET /feeds/:slug.ics`**.

## Roles

**OWNER / ADMIN** (`opsRoles`) for destructive/privileged ops; **`careRoles`** adds **CARETAKER** where routes allow. Airbnb **host profile** create/update/delete uses **`careRoles`** so caretakers can manage grouping labels.

## iCal pipeline

Inbound sync via **`syncInboundIcals`** (worker BullMQ optional / manual POST sync). Outbound feed built from confirmed bookings + certain availability blocks.

## Don’t commit

`.env`, private keys, Supabase **service_role**. `.cursor/oracle-deploy-context.md` lists paths only—no secrets.
