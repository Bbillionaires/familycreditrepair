# Changes: AI chat assistant for paid members

## Files changed
- `package.json`: added `openai` (^6.48.0) dependency.
- `prisma/schema.prisma`: added `User.chatCreditBalance`, `User.chatUsages`/`chatPackPurchases` relations, and three new models (`ChatUsage`, `ChatPackPurchase`, `ChatSettings`). `ChatUsage.userId`/`ChatPackPurchase.userId` both use `onDelete: Cascade`, explicitly reasoned in schema comments/spec as different from the `Purchase`/`MentorRequest` `SetNull` precedent — these two have no standalone value once their user is gone.
- `prisma/migrations/20260723183621_add_chat_feature/migration.sql`: new migration (diff+deploy workaround, same as every prior schema change in this repo).
- `src/lib/openai.ts` (new): `getOpenAI()`/`isOpenAIConfigured()`, mirroring `src/lib/stripe.ts`'s exact pattern. `CHAT_MODEL` defaults to `gpt-4o-mini`, overridable via `OPENAI_CHAT_MODEL`. `CHAT_MAX_TOKENS = 500`.
- `src/lib/chat-settings.ts` (new): `getChatSettings()` — singleton upsert (`update: {}`, `create: { id: "singleton" }`), shared by every call site rather than duplicated (unlike `getSiteOrigin()`, this helper has real DB side effects that must stay consistent).
- `src/lib/site.ts`: added `chatDisclaimer`.
- `src/app/account/chat-actions.ts` (new): `sendChatMessage` (eligibility → OpenAI-configured check → rate limit → today's-usage count → hard-cap check → free-vs-credit determination → truncate/validate history → build system prompt from purchased Materials/Courses → call OpenAI → log usage/decrement credit only on success) and `startQuestionPackCheckout` (Stripe one-time Checkout mirroring `startMaterialCheckout`'s inline `price_data` pattern).
- `src/app/api/stripe/webhook/route.ts`: extended the existing one-time-payment branch to check for a matching `ChatPackPurchase` first (via `stripeSessionId`), crediting `chatCreditBalance` inside a `db.$transaction` (first use of a transaction in this codebase, commented as such) guarded by `status !== "paid"` for idempotency; falls through to the existing `Purchase` handling unchanged when no chat pack matches.
- `src/app/account/chat/page.tsx` (new): eligibility check (`isComped || membershipStatus === "active"`), reuses the existing `BecomeMemberForm` for the upsell case rather than duplicating it.
- `src/app/account/chat/chat-widget.tsx` (new, client component): local `useState` message array (no persistence, no load-on-mount), calls `sendChatMessage` directly as an async function (not `useActionState`) from the submit handler, persistently renders the chat disclaimer, shows free-questions-remaining/credit-balance from the most recent response, and renders a "Buy a question pack" form (via `useActionState` around `startQuestionPackCheckout`, since that IS a single-action checkout redirect) when the specific "no free questions left" error is returned.
- `src/app/account/page.tsx`: added an "Open the AI chat assistant →" link in both the `isComped` and `membershipStatus === "active"` branches of the Membership section only.
- `src/app/admin/chat-settings/actions.ts`, `chat-settings-form.tsx`, `page.tsx` (all new): singleton settings edit form (no create/delete, matching there being exactly one row).
- `src/app/admin/layout.tsx`: added `Chat Settings` nav link, after `Mentoring requests` and before `Export`.
- `.env.example`: added `OPENAI_API_KEY` (optional) and `OPENAI_CHAT_MODEL` (optional, documented default).

## Notes / deviations from spec
- The spec's `admin/chat-settings/page.tsx` snippet showed the form inlined directly in the page; implemented instead as a separate `chat-settings-form.tsx` client component following this repo's actual established convention (every other admin CRUD page — `MentorForm`, `ClassForm`, `MaterialForm` — uses a separate form component, not an inline one). Behavior is identical; this is a structural consistency choice, not a functional deviation.
- Everything else implemented exactly as specified, including the exact ordering of checks in `sendChatMessage` (quota/rate-limit checks before the OpenAI call; usage logging and credit decrement only after a confirmed successful response).

## Build/lint status
- `npm run lint`: 0 errors, 6 warnings (4 pre-existing from the membership feature, 2 new — both the same class: `_prevState`/`_formData` unused in `startQuestionPackCheckout`, required by its `useActionState`-compatible signature even though it doesn't read form data).
- `npm run build`: passes. `/account/chat` and `/admin/chat-settings` both compiled and are listed in the route output, alongside every other existing route.
