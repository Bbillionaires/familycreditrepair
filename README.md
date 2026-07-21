# CreditCareCourse.com — Free Credit Education Site

A Next.js site for a free credit-education program: video testimonials, a
library of free and paid downloadable materials, and a signup calendar for
in-person/online classes. All classes are free — the site says so
prominently on the home page, the calendar page, and the footer.

## Stack

- **Next.js 16** (App Router, Server Actions) + React 19 + Tailwind CSS 4
- **Prisma 7** + **Postgres** (via the standard `@prisma/adapter-pg` driver
  adapter, required by Prisma 7) — works with any Postgres host (Neon,
  Supabase, Vercel's own Postgres storage, a local Postgres for dev, etc.)
- **Stripe Checkout** for paid materials (optional — free materials work
  with no Stripe account at all)
- Admin area protected by a single shared password (`ADMIN_PASSWORD`), no
  user database required

## Getting started

You need a Postgres database before anything else works — this app has no
zero-config local fallback. Options: run Postgres locally, use a free Neon
project (neon.tech), or point at the same Postgres your production
deployment uses (a separate branch/database on the same host is cleanest).

```bash
npm install
cp .env.example .env    # then set DATABASE_URL and the other values below
npm run db:migrate      # applies prisma/migrations/ to your database
npm run db:seed         # optional: adds a couple of sample rows
npm run dev
```

Visit `http://localhost:3000` for the public site and
`http://localhost:3000/admin/login` for the admin area.

## Environment variables

| Variable | Required? | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Use the "pooled" variant if your host offers one. |
| `ADMIN_PASSWORD` | yes | Password to log in at `/admin/login` |
| `SESSION_SECRET` | yes | Random string used to sign the admin session cookie (`openssl rand -base64 32`) |
| `STRIPE_SECRET_KEY` | only for paid materials | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | only for paid materials | Signing secret for the `/api/stripe/webhook` endpoint |
| `SITE_URL` | optional | Overrides the auto-detected base URL used in Stripe redirect links |

Without `STRIPE_SECRET_KEY` set, free materials still work end-to-end; the
"Buy now" flow shows a friendly message asking the visitor to contact you
directly instead of erroring out.

## Managing content

Everything (testimonials, materials, classes) is managed from `/admin`
after logging in with `ADMIN_PASSWORD`:

- **Testimonials** — paste a YouTube or Vimeo URL plus a name/quote.
- **Materials** — either upload a file (stored privately outside of
  `public/`, never served without a valid purchase/download token) or link
  to an externally hosted file. Set price to `0` for a free download.
- **Classes** — set date/time, duration, location, and an optional
  capacity. The public calendar page shows spots remaining and closes
  signups once a class is full.

Free-material downloads and paid Stripe purchases both go through
`/api/download/[token]`, which only serves a file after confirming a
matching `Purchase` row has `status = "paid"`.

## Stripe setup (only needed to sell materials)

1. Create a Stripe account and grab your secret key.
2. Add a webhook endpoint pointing at `/api/stripe/webhook` for the
   `checkout.session.completed` event, and copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
3. For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

The purchase success page also double-checks payment status directly with
Stripe, so downloads still unlock correctly even if the webhook is slow or
not yet configured in a given environment.

## Deploying

Any Node.js host works, including Vercel. `npm run build` runs
`prisma migrate deploy` first, so pushing to your deploy branch applies any
new migrations automatically as long as `DATABASE_URL` is set on the host.

**Known remaining gap:** admin-uploaded material files are still saved to
local disk (`/storage`, outside `public/`, deliberately not web-servable
directly — see `src/lib/storage.ts`). On Vercel (or any serverless/
ephemeral-filesystem host) those files disappear the moment the function
instance recycles, so an uploaded file may 404 on download shortly after
upload, even though the site itself now loads correctly. **Materials added
via an external URL are unaffected** — this only hits the "upload a file"
option in `/admin/materials`. Until this is moved to object storage (S3,
Vercel Blob, R2, etc.), prefer linking to an externally-hosted file for
anything deployed to Vercel.
