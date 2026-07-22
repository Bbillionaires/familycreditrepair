# Changes: Optional $9.99/month membership (Stripe subscription)

## Files changed
- `prisma/schema.prisma`: added `isComped`, `membershipStatus`, `stripeCustomerId`, `stripeSubscriptionId` to `User`.
- `prisma/migrations/20260722232503_add_user_membership_fields/migration.sql`: new migration (generated via `prisma migrate diff` + `prisma migrate deploy`, since `prisma migrate dev` isn't usable non-interactively in this environment — same constraint as prior schema-changing tasks in this repo).
- `src/lib/site.ts`: added `membershipDisclaimer` string, matching the tone of the existing three disclaimers.
- `src/app/account/membership-actions.ts` (new): `startMembershipCheckout` (Stripe subscription Checkout Session, inline `price_data`, `client_reference_id` correlation) and `openBillingPortal` (Stripe Billing Portal redirect).
- `src/app/account/become-member-form.tsx` (new): client form wrapping `startMembershipCheckout`.
- `src/app/account/manage-membership-form.tsx` (new): client form wrapping `openBillingPortal`.
- `src/app/account/page.tsx`: added a "Membership" section (priority: comped → active → none/past_due/canceled) between the account-info card and "My materials".
- `src/app/api/stripe/webhook/route.ts`: extended `checkout.session.completed` to branch on `session.mode === "subscription"`; added `customer.subscription.updated`/`customer.subscription.deleted` handling. All membership writes use `updateMany` so an unmatched id/subscription silently no-ops instead of throwing.
- `src/app/admin/users/page.tsx` (new): admin table of all users with a membership status badge and per-row Comp/Un-comp toggle.
- `src/app/admin/users/actions.ts` (new): `toggleComp(userId)` server action.
- `src/app/admin/layout.tsx`: added `{ href: "/admin/users", label: "Users" }` nav link.

## Notes / deviations from spec
- None — implemented exactly as specified. `prisma migrate dev` required the diff+deploy workaround noted above (same as documented necessity in this repo's history), not a deviation from the intended schema.

## Build/lint status
- `npm run lint`: 0 errors, 4 warnings (`_prevState`/`_formData` unused — both params in `membership-actions.ts` are genuinely unused since these are no-arg actions that must still match `useActionState`'s `(prevState, formData)` signature; same class of warning would appear anywhere this pattern is used with no data actually read).
- `npm run build`: passes. `prisma migrate deploy && next build` completed cleanly; `/admin/users` and all account/webhook changes compiled with no TypeScript errors.
