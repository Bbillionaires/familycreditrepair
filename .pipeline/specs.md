# Spec: Optional $9.99/month membership (Stripe subscription)

## Summary

Add an optional, non-gating recurring "membership" ($9.99 charged today, $9.99 every month after) that logged-in users can start from `/account`. It is purely a voluntary support/commitment mechanism — no existing free content (classes, free materials) is ever gated by membership status, and no new gating logic should be added anywhere outside the `/account` membership section itself. Wording must follow the site's existing CROA-conscious disclaimer tone (see `src/lib/site.ts`, `src/components/disclaimer-banner.tsx`): membership is framed as voluntary support, never as something required for, or that expedites, any credit-repair outcome.

Billing shape (confirmed): a standard Stripe subscription, `mode: "subscription"`, inline `price_data` with `recurring: { interval: "month" }`, `unit_amount: 999` — no separate one-time fee, the "first charge" is simply the subscription's first billing cycle. This mirrors the existing inline-`price_data` Checkout pattern already used for one-time Material/Course purchases (`src/app/materials/actions.ts`, `src/app/courses/actions.ts`) — no pre-created Stripe Price object needed, so no manual Stripe Dashboard setup for the price itself.

Admins can toggle any user to `isComped = true` from a new `/admin/users` page — this waives billing indefinitely (no membership CTA shown, no charge ever attempted) until an admin flips it back off. Subscription lifecycle (activation, renewal implicitly via Stripe, cancellation, payment failure) is handled entirely by extending the existing Stripe webhook handler (`src/app/api/stripe/webhook/route.ts`) with `customer.subscription.updated`/`customer.subscription.deleted` handling — no manual admin action is ever required for the common lifecycle cases.

Reuses existing env vars only: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`. No new env vars.

## Out of scope (explicitly deferred, do not build)

- **Certificates.** No course-completion tracking exists yet (Course/Lesson currently has no "completed" concept at all). Do not add any certificate logic, and do not touch Course/Lesson models.
- **1-on-1 mentoring with signed agreements.** No mentor or booking data model exists. Do not add a Mentor model, booking flow, or e-signature/agreement logic.
- Both are real future requests from the site owner — leave them out entirely rather than stub them, so nothing half-built creates confusion later.

## Files to change

### `prisma/schema.prisma`

- Change: add four fields to the existing `User` model (do not create a new model — this mirrors the existing flat-field style already used for `sessionVersion`/`failedLoginAttempts`/`lockedUntil`).

```prisma
model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  username             String    @unique
  passwordHash         String
  sessionVersion       Int       @default(0)
  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime?
  resetToken           String?   @unique
  resetTokenExpiresAt  DateTime?
  isComped             Boolean   @default(false)
  membershipStatus     String    @default("none")
  stripeCustomerId     String?
  stripeSubscriptionId String?   @unique
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}
```

- `membershipStatus` is a plain string (matching `Purchase.status`'s existing plain-string convention rather than a Prisma enum), one of: `"none"`, `"active"`, `"past_due"`, `"canceled"`. Default `"none"` for every user who has never checked out.
- `stripeCustomerId` / `stripeSubscriptionId` are nullable — only populated once a user actually completes a membership checkout. `stripeSubscriptionId` is `@unique` so webhook lookups by subscription ID are precise (0 or 1 row).
- Generate the migration against a real reachable Postgres exactly as prior schema-changing tasks in this repo did (start the local Postgres if needed, run `npx prisma migrate dev --name add_user_membership_fields`), then confirm `npx prisma generate` succeeds.

### `src/lib/site.ts`

- Change: add one new disclaimer string, following the exact tone/voice of the existing three disclaimers (do not invent new phrasing style).

```ts
membershipDisclaimer:
  "Membership is completely optional and never required — every free class, and any material marked Free, stays free whether or not you join. Membership is a way to support this project directly. It is not a credit repair service, does not guarantee any change to your credit score or report, and does not expedite anything else on this site. Cancel anytime.",
```

### `src/app/account/membership-actions.ts` (new file)

`"use server"` file, following the exact conventions of `src/app/materials/actions.ts` (duplicate the local `getSiteOrigin()` helper here too — this repo's established convention is to duplicate this small helper per-file rather than share it, confirmed by its presence in both `materials/actions.ts`, `courses/actions.ts`, and `account/forgot-password/actions.ts`).

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

async function getSiteOrigin() { /* identical body to materials/actions.ts's version */ }

export type MembershipActionState = { error?: string } | undefined;

export async function startMembershipCheckout(
  _prevState: MembershipActionState,
  _formData: FormData
): Promise<MembershipActionState>

export async function openBillingPortal(
  _prevState: MembershipActionState,
  _formData: FormData
): Promise<MembershipActionState>
```

**`startMembershipCheckout` behavior:**
1. `const { userId } = await requireUser();` then `const user = await db.user.findUnique({ where: { id: userId } }); if (!user) return { error: "Account not found." };`
2. If `!isStripeConfigured()`, return `{ error: "Online payments aren't set up yet. Please contact us directly." }` (mirrors the existing degrade-gracefully message style in `materials/actions.ts`).
3. Guard double-submit / already-a-member: if `user.isComped || user.membershipStatus === "active"`, return `{ error: "You're already a member — thank you!" }` without creating a new Checkout Session.
4. `const origin = await getSiteOrigin(); const stripe = getStripe();`
5. Create the Checkout Session:
```ts
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  payment_method_types: ["card"],
  customer_email: user.email,
  client_reference_id: user.id,
  line_items: [
    {
      price_data: {
        currency: "usd",
        unit_amount: 999,
        recurring: { interval: "month" },
        product_data: { name: "CreditCareCourse.com Membership" },
      },
      quantity: 1,
    },
  ],
  success_url: `${origin}/account?membership=success`,
  cancel_url: `${origin}/account`,
});
```
6. If `!session.url`, return `{ error: "Could not start checkout. Please try again." }`. Otherwise `redirect(session.url)`.
7. Note: unlike `Purchase`, no DB row is pre-created here — `client_reference_id` carries the user identity through to the webhook, so there is nothing to correlate against beforehand and no "pending" state needed for membership.

**`openBillingPortal` behavior:**
1. `const { userId } = await requireUser();` then load the user.
2. If `!user.stripeCustomerId`, return `{ error: "No billing account found yet." }`.
3. `const origin = await getSiteOrigin(); const stripe = getStripe();`
4. `const portalSession = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: \`${origin}/account\` });`
5. If `!portalSession.url`, return `{ error: "Could not open the billing portal. Please try again." }`. Otherwise `redirect(portalSession.url)`.

### `src/app/api/stripe/webhook/route.ts`

- Change: extend the existing handler with new branches alongside the existing `checkout.session.completed` branch. Keep the existing one-time-purchase behavior byte-for-byte unchanged; branch on `session.mode` within `checkout.session.completed`, and add two new top-level `if (event.type === ...)` blocks for subscription lifecycle events.

```ts
if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode === "subscription") {
    const userId = session.client_reference_id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (userId && customerId && subscriptionId) {
      await db.user.updateMany({
        where: { id: userId },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          membershipStatus: "active",
        },
      });
    }
  } else if (session.payment_status === "paid") {
    // existing one-time Purchase handling, unchanged
    await db.purchase.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "paid" },
    });
  }
}

if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
  const subscription = event.data.object as Stripe.Subscription;
  const status =
    event.type === "customer.subscription.deleted"
      ? "canceled"
      : subscription.status === "active"
        ? "active"
        : subscription.status === "canceled"
          ? "canceled"
          : "past_due"; // covers past_due, unpaid, incomplete, incomplete_expired, trialing (unused), paused

  await db.user.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { membershipStatus: status },
  });
}
```

- Use `updateMany` (not `update`) for every membership-related write in this file specifically so a not-found `id`/`stripeSubscriptionId` (unknown user, stale test webhook, race condition) matches zero rows instead of throwing — this is the concrete answer to the "webhook arrives for a user who no longer exists" edge case. Always `return NextResponse.json({ received: true })` at the end regardless, exactly as today.
- No dedicated idempotency table is needed for the new branches: every write here is an idempotent *set* (not a create or increment), so Stripe redelivering the same event twice just sets the same values twice — a no-op difference. This differs from `Purchase`, which needs `stripeSessionId @unique` because it *creates* rows; membership never creates a row, only updates an existing `User`.

### `src/app/account/page.tsx`

- Change: insert a new "Membership" section directly after the existing username/email info block (before "My materials"), using the same `rounded-lg border border-slate-200 p-5`-style card as the info block above it.
- Logic (evaluate in this priority order):
  1. `user.isComped` → render: *"You have complimentary membership access — thank you for being part of {site.name}."* No button.
  2. else `user.membershipStatus === "active"` → render: *"You're a member ($9.99/month)."* plus `<ManageMembershipForm />`.
  3. else (`"none" | "past_due" | "canceled"`) → render `<DisclaimerBanner>{site.membershipDisclaimer}</DisclaimerBanner>` plus copy *"Optional membership — $9.99 to join today, $9.99/month after."* plus `<BecomeMemberForm />`. If status is `"past_due"` or `"canceled"` specifically, prepend a short line noting that ("Your last membership payment didn't go through." / "Your membership was canceled.") before the same become-a-member CTA — clicking it starts a fresh Checkout Session; the webhook naturally overwrites `stripeSubscriptionId`/`membershipStatus` with the new subscription.
- Import `site` from `@/lib/site` and `DisclaimerBanner` from `@/components/disclaimer-banner` (both already exist).

### `src/app/account/become-member-form.tsx` (new file)

`"use client"` component, following the exact `useActionState` pattern of `src/app/account/change-password-form.tsx` (read that file for the precise structure/error-rendering convention before writing this). Wraps a `<form action={...}>` calling `startMembershipCheckout`, single submit button labeled "Become a member — $9.99/mo", renders `state.error` in the same red-text style used elsewhere (`text-sm text-red-600`).

### `src/app/account/manage-membership-form.tsx` (new file)

Same pattern, wraps `openBillingPortal`, single submit button labeled "Manage membership".

### `src/app/admin/users/page.tsx` (new file)

Follows `src/app/admin/materials/page.tsx`'s exact table structure/styling.

```tsx
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { toggleComp } from "./actions";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  // table columns: Username, Email, Membership (badge), Joined, [Comp/Un-comp button]
}
```

- Membership badge logic per row: `u.isComped` → "Comped" (green badge, same `bg-green-100 text-green-700` style as the `Published` badge in `admin/materials/page.tsx`); else `u.membershipStatus === "active"` → "Active" (green); else `"past_due"` → "Past due" (amber, `bg-amber-100 text-amber-700`); else `"canceled"` → "Canceled" (slate, `bg-slate-100 text-slate-500`); else `"none"` → "—" (slate, muted, no badge pill needed, just the em-dash in `text-slate-400`).
- Action column: a `<form action={toggleComp.bind(null, u.id)}>` with a single submit button reading "Un-comp" if `u.isComped` else "Comp" — same `.bind(null, id)` pattern as `deleteMaterial` in `admin/materials/page.tsx`.
- Empty state: `No users yet.` row, matching the `No materials yet.` convention.

### `src/app/admin/users/actions.ts` (new file)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

export async function toggleComp(userId: string) {
  await requireAdmin();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { isComped: !user.isComped } });
  revalidatePath("/admin/users");
}
```

- No form state / validation needed — this is a no-arg toggle, matching `deleteMaterial`'s existing no-`useActionState` convention exactly.

### `src/app/admin/layout.tsx`

- Change: add one entry to the `links` array: `{ href: "/admin/users", label: "Users" }` (place it after `"Classes"`/`"Courses"`, before `"Export"` — match existing array order style).

## Edge cases

- **User is both comped and has completed a real Stripe checkout (either order):** No reconciliation needed — `isComped` and `membershipStatus` are independent fields checked in strict priority order (`isComped` first) purely at render/CTA time in `/account`. Real Stripe webhooks keep updating `membershipStatus` in the background regardless of `isComped`'s value; if an admin later un-comps the user, whatever `membershipStatus` Stripe most recently reported becomes visible again automatically, with no extra sync logic required.
- **Webhook arrives for a user id / subscription id that doesn't exist (deleted user, stale test event, race condition):** All membership webhook writes use `updateMany`, which matches zero rows silently instead of throwing. The handler always returns `{ received: true }` with 200 regardless, exactly as the existing purchase-completion branch does.
- **Subscription lapses (`past_due`/`canceled`):** Per the business requirement, this must never affect access to free classes or free materials anywhere else in the app — no other file in this spec should read `membershipStatus` for any access-control decision. Only `/account`'s own display and CTA copy change.
- **Double-submission of "Become a member":** Guarded at the top of `startMembershipCheckout` by checking `user.isComped || user.membershipStatus === "active"` before creating a Checkout Session, returning a friendly "already a member" error instead of a second subscription.
- **Duplicate webhook delivery for the same event (Stripe retries):** Safe by construction — every membership write is an idempotent `set`, not a create or increment, so replaying the same event twice produces the same end state. `stripeSubscriptionId @unique` exists for query precision (0-or-1-row lookups), not as a dedup mechanism.
- **Admin un-comps a user who never paid (no Stripe subscription ever created):** `membershipStatus` is untouched by the un-comp action and remains whatever it already was — `"none"` by default for a user webhooks never touched — so `/account` correctly falls back to showing the "become a member" CTA. No special-casing needed.
- **Env vars:** No new ones. Reuses `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`, all already documented in `.env.example`. Flag this to the site owner as a deployment note (not a code change): in the Stripe Dashboard, the existing webhook endpoint must also be subscribed to the `customer.subscription.updated` and `customer.subscription.deleted` event types (in addition to whatever it already sends `checkout.session.completed` for) — if the endpoint is already configured to send all event types, no dashboard change is needed at all.
- **Wording/legal:** All new user-facing copy must go through `site.membershipDisclaimer` and match the existing soft, non-outcome-linked tone. Do not use words like "unlock," "premium," or anything implying membership affects credit-repair results or speed.

## Open questions

None — all structural decisions were confirmed directly with the site owner (billing shape, comp-toggle behavior, free-core-stays-free requirement) before this spec was written.
