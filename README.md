# Orzino Admin

Internal dashboard for Orzino — a separate Next.js app from the customer storefront
(`orzino`), sharing only its MongoDB Atlas database. See `docs/Orzino-Admin-Dashboard-PRD.pdf`
in the storefront repo for the full plan.

## Setup

1. Copy `.env.example` to `.env.local` and fill in `MONGODB_URI` (same Atlas cluster the
   storefront uses), `MONGODB_DB`, and a fresh `AUTH_SECRET` (different from the storefront's).
2. `npm install`
3. `npm run db:check` — verifies the connection and creates indexes.
4. `npm run create-admin -- --email you@orzino.com --password "Secret#123"` — creates the
   one admin account (there's no public sign-up route).
5. `npm run dev`, then sign in at `/login`.

## Local testing without Atlas

`npm run dev:memory` boots a throwaway in-memory MongoDB and seeds a test admin
(`admin@orzino.test` / `TestAdmin#123`) automatically — nothing touches Atlas.
