# Spec: AI chat assistant for paid members

## Summary

Add an OpenAI-backed chat assistant, available only to members (`user.isComped || user.membershipStatus === "active"`), scoped to credit/budgeting/financial education topics via a system prompt. Members get 3 free questions per day (admin-configurable); beyond that they draw down a purchased "question pack" credit balance (also admin-configurable price/size), with a hard daily ceiling that applies regardless of credit balance. No conversation content is ever persisted server-side — only a lightweight per-question usage timestamp, purely for quota math. The conversation itself lives in client-side React state for the duration of the page session. Every response is non-streaming. This is the one deliberate exception to this site's "membership never gates access" principle established in the earlier membership feature — chat access itself IS the membership perk being gated here, by explicit business decision.

## Out of scope — do not build

- Any persistence of message/conversation content (system prompt, user questions, or assistant replies) to the database. Only a bare usage-count timestamp is stored.
- Any knowledge-base/RAG retrieval system — the assistant answers from its own general knowledge plus the system prompt only.
- Any real lesson-by-lesson completion tracking — this data doesn't exist in this codebase (`Lesson` has no completion/progress field anywhere) and this spec does not add it. Personalization is limited to mentioning which courses/materials the member has purchased (from existing `Purchase` rows), nothing more granular.
- Streaming responses.
- Certificates/quiz work (separate, later task).

## New dependency

Add `openai` (official Node SDK) to `package.json` dependencies — not currently installed. Run `npm install openai` as part of implementation.

## Files to change

### `prisma/schema.prisma`

Add three new models and two new fields/relations on `User`:

```prisma
model User {
  // ...all existing fields unchanged...
  chatCreditBalance     Int                @default(0)
  chatUsages            ChatUsage[]
  chatPackPurchases     ChatPackPurchase[]
}

model ChatUsage {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}

model ChatPackPurchase {
  id               String   @id @default(cuid())
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId           String
  questionsGranted Int
  amountCents      Int
  stripeSessionId  String   @unique
  status           String   @default("pending")
  createdAt        DateTime @default(now())

  @@index([userId])
}

model ChatSettings {
  id                 String   @id @default("singleton")
  dailyFreeQuestions Int      @default(3)
  packQuestionCount  Int      @default(10)
  packPriceCents     Int      @default(200)
  hardDailyCap       Int      @default(20)
  updatedAt          DateTime @updatedAt
}
```

- **`ChatUsage.userId` and `ChatPackPurchase.userId` both use `onDelete: Cascade`**, a deliberate departure from the `SetNull` precedent used for `Purchase.materialId`/`courseId` and `MentorRequest.mentorId`. Those two exist to preserve business-record history that has standalone value even after the referenced entity (a Material, a Mentor) is gone — a `Purchase` or `MentorRequest` row is meaningful on its own. `ChatUsage` and `ChatPackPurchase` have no standalone value once their `User` is gone: a usage-count timestamp with no owner is meaningless, and a pack-purchase record for a deleted account serves no one (unlike `Purchase`, which isn't even tied to `User` by FK at all — it's keyed by a free-text `email`, so it survives account deletion by construction). `Cascade` here is the correct, differently-reasoned choice, not a copy-paste of either prior precedent.
- `ChatSettings.id` defaults to the literal string `"singleton"` so the row can always be found/created by that fixed id — see `src/lib/chat-settings.ts` below for the read-or-create pattern.
- Generate the migration via the same non-interactive workaround used for every prior schema change in this repo: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_add_chat_feature/migration.sql` (create the directory first), then `npx prisma migrate deploy`, then `npx prisma generate`.

### `src/lib/openai.ts` (new file)

Mirrors `src/lib/stripe.ts`'s exact singleton-client-getter and `isXConfigured()` pattern.

```ts
import "server-only";
import OpenAI from "openai";

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
export const CHAT_MAX_TOKENS = 500;

let openaiClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your environment to enable the AI chat assistant."
    );
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
```

### `src/lib/chat-settings.ts` (new file)

Unlike this repo's usual per-file-duplicated small helpers (e.g. `getSiteOrigin()`), this one has a real database side effect (create-if-missing) that must behave identically everywhere it's called — so it lives in one shared file, not duplicated. Both the admin settings page and the chat-message action call this same function.

```ts
import "server-only";
import { db } from "@/lib/db";

export async function getChatSettings() {
  return db.chatSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}
```

- `update: {}` means "if the row exists, change nothing, just return it as-is"; `create: { id: "singleton" }` relies on the schema's own field defaults for everything else. This is the exact answer to "ChatSettings row doesn't exist yet" — every call site transparently gets a valid row, no manual seed step, no error.

### `src/lib/site.ts`

Add one new disclaimer string, matching the existing three's tone exactly:

```ts
chatDisclaimer:
  "This AI assistant provides general credit and financial education only. It is not a substitute for advice from a licensed financial, legal, tax, or credit professional, does not have access to your actual credit report or financial accounts, and can make mistakes — always fact-check anything it tells you before acting on it. It does not provide credit repair services and does not guarantee any change to your credit score or report.",
```

### `src/app/account/chat-actions.ts` (new file)

`"use server"`. Two exported functions. Note the interaction model: `sendChatMessage` is **not** a `useActionState`-bound form action — it's called directly as an async function from a client component's event handler (a supported, standard way to invoke a Server Action; no `<form>` needed). Follow `src/app/materials/actions.ts`'s exact inline-`price_data` Checkout pattern for `startQuestionPackCheckout`, and duplicate the local `getSiteOrigin()` helper here too, per this repo's established per-file convention for that specific helper (unlike `chat-settings.ts` above, `getSiteOrigin()` is a pure, side-effect-free computation — safe to duplicate, which is why every other action file does).

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getOpenAI, isOpenAIConfigured, CHAT_MODEL, CHAT_MAX_TOKENS } from "@/lib/openai";
import { getChatSettings } from "@/lib/chat-settings";
import { site } from "@/lib/site";

async function getSiteOrigin() { /* identical duplicated body */ }

const RATE_LIMIT_MS = 3000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SendChatMessageResult =
  | { error: string }
  | { reply: string; questionsUsedToday: number; freeQuestionsRemaining: number; creditBalance: number };

export async function sendChatMessage(messages: ChatMessage[]): Promise<SendChatMessageResult>

export type PackCheckoutState = { error?: string } | undefined;

export async function startQuestionPackCheckout(
  _prevState: PackCheckoutState,
  _formData: FormData
): Promise<PackCheckoutState>
```

**`sendChatMessage(messages)` behavior, in this exact order:**

1. `const { userId } = await requireUser();` then load the user. If not found, return `{ error: "Account not found." }`.
2. Eligibility check (server-side, every call — never trust that the client only calls this when eligible, per the "membership lapses mid-session" edge case): `if (!user.isComped && user.membershipStatus !== "active") return { error: "An active membership is required to use the chat assistant." };`
3. `if (!isOpenAIConfigured()) return { error: "The chat assistant isn't set up yet. Please check back later." };` (degrade gracefully, matches every other optional integration).
4. Rate limit: `const lastUsage = await db.chatUsage.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }); if (lastUsage && Date.now() - lastUsage.createdAt.getTime() < RATE_LIMIT_MS) return { error: "You're sending messages too quickly — please wait a moment and try again." };`
5. Compute today's usage count in UTC: `const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0); const questionsUsedToday = await db.chatUsage.count({ where: { userId, createdAt: { gte: startOfToday } } });`
6. `const settings = await getChatSettings();`
7. `if (questionsUsedToday >= settings.hardDailyCap) return { error: "You've reached today's question limit, even with purchased credits. Please try again tomorrow." };` — distinct message from the "buy more" case below, per the spec'd edge case.
8. Determine whether this question is free or must draw a credit: `const isFree = questionsUsedToday < settings.dailyFreeQuestions;`
9. If not free: `if (!isFree && user.chatCreditBalance <= 0) return { error: "You've used today's free questions. Purchase a question pack to keep chatting." };`
10. Validate/truncate the incoming `messages` array before calling OpenAI: reject if any message content exceeds `MAX_MESSAGE_LENGTH` (return `{ error: "Message is too long." }`); take only the last `MAX_HISTORY_MESSAGES` entries of `messages` (silently drop older ones — this is a cost/abuse guard, not a user-facing error).
11. Build the system prompt (see exact content below), including purchased-content context via the same query shape as `src/app/account/page.tsx`'s `materialPurchases`/`coursePurchases` (reuse that exact `where`/`include` shape, case-insensitive email match, `status: "paid"`).
12. Call OpenAI:
```ts
const completion = await getOpenAI().chat.completions.create({
  model: CHAT_MODEL,
  max_tokens: CHAT_MAX_TOKENS,
  messages: [{ role: "system", content: systemPrompt }, ...truncatedMessages],
});
const reply = completion.choices[0]?.message?.content;
```
Wrap this call in try/catch. On any thrown error, or if `reply` is falsy, return `{ error: "The assistant couldn't respond right now. Please try again." }` — **do not** proceed to step 13 (no usage logged, no credit decremented) on failure, per the explicit edge case that a failed call must never consume a free question or credit.
13. Only on success: `await db.chatUsage.create({ data: { userId } });` and, if `!isFree`, `await db.user.update({ where: { id: userId }, data: { chatCreditBalance: { decrement: 1 } } });`. Then return `{ reply, questionsUsedToday: questionsUsedToday + 1, freeQuestionsRemaining: Math.max(0, settings.dailyFreeQuestions - (questionsUsedToday + 1)), creditBalance: isFree ? user.chatCreditBalance : user.chatCreditBalance - 1 }`.

**System prompt content** (exact required elements — coder may adjust phrasing but must include all of these):
- States it is an educational assistant for CreditCareCourse.com, scoped to consumer credit, credit scores, budgeting, debt management, and mortgage/homeownership readiness education.
- Instructs it to politely decline and redirect back to those topics if asked about anything unrelated.
- States it is not a licensed financial, legal, tax, or credit advisor, must not guarantee any specific credit score change or financial outcome, and should remind the user to consult a qualified professional for advice specific to their situation.
- If the member has any paid materials/courses on file (from the Purchase query in step 11), lists their titles and instructs the assistant to use them as helpful context for examples when relevant, but to still answer any in-scope question regardless of what's on that list.
- Note in a code comment above the prompt: this is a soft steering mechanism only, not a security boundary — a sufficiently determined user can still get off-topic responses; its purpose is discouraging casual off-topic/general-chatbot use of a paid seat, not guaranteeing topic enforcement.

**`startQuestionPackCheckout` behavior:**
1. `const { userId } = await requireUser();` load user; if not found, `{ error: "Account not found." }`.
2. `if (!user.isComped && user.membershipStatus !== "active") return { error: "An active membership is required to purchase question packs." };`
3. `if (!isStripeConfigured()) return { error: "Online payments aren't set up yet. Please contact us directly." };`
4. `const settings = await getChatSettings();`
5. `const origin = await getSiteOrigin(); const stripe = getStripe();`
6. Create the Checkout Session (mirrors `startMaterialCheckout`'s inline `price_data`, `mode: "payment"`):
```ts
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  customer_email: user.email,
  line_items: [
    {
      price_data: {
        currency: "usd",
        unit_amount: settings.packPriceCents,
        product_data: { name: `${settings.packQuestionCount} AI chat questions` },
      },
      quantity: 1,
    },
  ],
  success_url: `${origin}/account/chat?pack=success`,
  cancel_url: `${origin}/account/chat`,
});
```
7. `if (!session.url) return { error: "Could not start checkout. Please try again." };`
8. `await db.chatPackPurchase.create({ data: { userId: user.id, questionsGranted: settings.packQuestionCount, amountCents: settings.packPriceCents, stripeSessionId: session.id, status: "pending" } });`
9. `redirect(session.url);`

### `src/app/api/stripe/webhook/route.ts`

Extend the existing `checkout.session.completed` handler's `session.payment_status === "paid"` branch (the one-time-payment branch, distinct from the `session.mode === "subscription"` branch already there) to check for a matching `ChatPackPurchase` first:

```ts
} else if (session.payment_status === "paid") {
  const chatPack = await db.chatPackPurchase.findUnique({ where: { stripeSessionId: session.id } });

  if (chatPack) {
    if (chatPack.status !== "paid") {
      await db.$transaction([
        db.chatPackPurchase.update({ where: { id: chatPack.id }, data: { status: "paid" } }),
        db.user.update({
          where: { id: chatPack.userId },
          data: { chatCreditBalance: { increment: chatPack.questionsGranted } },
        }),
      ]);
    }
    // status already "paid" — replayed/duplicate webhook delivery, no-op, matches
    // the idempotency edge case explicitly (never double-credit the same session).
  } else {
    await db.purchase.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "paid" },
    });
  }
}
```

- This is the first use of `db.$transaction` in this codebase — justified here specifically because this is a genuine multi-table atomic update (flip the purchase's status AND credit the user's balance together); every other write in this app is single-table and doesn't need one. Note this in code comments so it doesn't read as an arbitrary new pattern.
- The `chatPack.status !== "paid"` check is the idempotency mechanism for this flow (parallel to how `admin/mentoring/actions.ts`'s `approveMentorRequest`/`declineMentorRequest` guard against re-processing via `request.status !== "pending"`) — a second delivery of the same event finds `status === "paid"` already and does nothing, so credits are never double-granted.
- `db.chatPackPurchase.findUnique` on a `stripeSessionId` that doesn't match anything (e.g. this checkout was actually a material/course purchase, or a stale/unrelated test event) returns `null`, falling through to the existing `Purchase`-based branch unchanged — this must not throw, matching the existing file's established resilience pattern.

### `src/app/account/chat/page.tsx` (new file)

```tsx
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import BecomeMemberForm from "../become-member-form";
import ChatWidget from "./chat-widget";

export const dynamic = "force-dynamic";

export default async function AccountChatPage() {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const eligible = user.isComped || user.membershipStatus === "active";

  if (!eligible) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Chat Assistant</h1>
        <p className="mt-2 text-slate-600">
          The AI chat assistant is available to members. Become a member to unlock it.
        </p>
        <div className="mt-4">
          <BecomeMemberForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">AI Chat Assistant</h1>
      <ChatWidget />
    </div>
  );
}
```

- Reuses the existing `BecomeMemberForm` client component directly (imported from `../become-member-form`) rather than duplicating its UI, per the requirement.
- A dedicated page (not a section bolted onto the already-long `/account` dashboard) — justified because a real chat UI (message list, input, live back-and-forth) needs its own layout space and doesn't fit the existing dashboard's card-list structure.

### `src/app/account/chat/chat-widget.tsx` (new file)

`"use client"`. Manages `messages: ChatMessage[]` in local React `useState` (starts empty — no history loaded from anywhere, per the no-persistence requirement). On submit: append the user's message to local state immediately, call `sendChatMessage(updatedMessages)` directly (not via `useActionState`/a bound form — call it like any async function inside the submit handler, awaiting its result), then either append the assistant's reply to local state and update displayed quota info, or show the returned error inline without appending a fake assistant message. Persistently render `<DisclaimerBanner>{site.chatDisclaimer}</DisclaimerBanner>` above the message list (not just once at the top and then hidden — visible at all times per the requirement). Show current `freeQuestionsRemaining`/`creditBalance` (from the most recent successful response, or fetched once on mount via an initial state — coder's call on the simplest way to show an initial number before the first message; acceptable to just show nothing until the first response arrives, since spec doesn't require a pre-first-message count). When a "no free questions and no credits" error is returned, render a `<form action={startQuestionPackCheckout}>` button (mirroring `become-member-form.tsx`'s `useActionState` pattern, since checkout redirect IS a `useActionState`-compatible single action) inline so the user can immediately buy a pack without navigating away.

### `src/app/account/page.tsx`

Add one line in the existing Membership section's `isComped`/`"active"` branches only (not in the `none`/`past_due`/`canceled` branch) linking to the new chat page:

```tsx
<Link href="/account/chat" className="text-sm font-medium text-blue-600 hover:underline">
  Open the AI chat assistant →
</Link>
```

Placed directly after the existing membership-status paragraph in both the `isComped` and `membershipStatus === "active"` branches.

### `src/app/admin/chat-settings/page.tsx` (new file), `src/app/admin/chat-settings/actions.ts` (new file)

Simple singleton edit form, no list/create/delete (there is only ever one row).

```ts
// actions.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { getChatSettings } from "@/lib/chat-settings";

const ChatSettingsSchema = z.object({
  dailyFreeQuestions: z.coerce.number().int().min(0),
  packQuestionCount: z.coerce.number().int().min(1),
  packPriceDollars: z.coerce.number().min(0),
  hardDailyCap: z.coerce.number().int().min(1),
});

export type ChatSettingsFormState = { error?: string; success?: boolean } | undefined;

export async function updateChatSettings(
  _prevState: ChatSettingsFormState,
  formData: FormData
): Promise<ChatSettingsFormState> {
  await requireAdmin();
  const parsed = ChatSettingsSchema.safeParse({
    dailyFreeQuestions: formData.get("dailyFreeQuestions"),
    packQuestionCount: formData.get("packQuestionCount"),
    packPriceDollars: formData.get("packPriceDollars"),
    hardDailyCap: formData.get("hardDailyCap"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await getChatSettings(); // ensures the singleton row exists before updating it
  await db.chatSettings.update({
    where: { id: "singleton" },
    data: {
      dailyFreeQuestions: parsed.data.dailyFreeQuestions,
      packQuestionCount: parsed.data.packQuestionCount,
      packPriceCents: Math.round(parsed.data.packPriceDollars * 100),
      hardDailyCap: parsed.data.hardDailyCap,
    },
  });
  revalidatePath("/admin/chat-settings");
  return { success: true };
}
```

`page.tsx` calls `await getChatSettings()` (guaranteeing the row exists) then renders a form (following `class-form.tsx`'s `useActionState` structure) pre-filled with current values, `packPriceDollars` computed as `settings.packPriceCents / 100`.

### `src/app/admin/layout.tsx`

Add `{ href: "/admin/chat-settings", label: "Chat Settings" }` to the `links` array, after `"Mentoring requests"` and before `"Export"`.

### `.env.example`

```
# Optional: enables the AI chat assistant for members (src/app/account/chat).
# Get this from platform.openai.com.
OPENAI_API_KEY=""
# Optional: defaults to gpt-4o-mini if unset.
OPENAI_CHAT_MODEL=""
```

## Edge cases

- **OpenAI not configured**: `sendChatMessage` returns a clear error before attempting any API call; `startQuestionPackCheckout` is unaffected by this (it's gated on Stripe, not OpenAI) since buying credits doesn't require OpenAI to be reachable.
- **0 free questions and 0 credits**: blocked with a message pointing at buying a pack (step 9 of `sendChatMessage`), distinct from the hard-cap message.
- **Hard daily cap hit**: blocked before the free/credit check even runs (step 7), with a message that doesn't suggest paying will help today.
- **Rate limiting**: a request within `RATE_LIMIT_MS` (3000ms) of the user's last logged `ChatUsage` row is rejected outright with a clear message — not queued, not delayed.
- **Webhook for an unknown/deleted user's pack purchase**: `db.chatPackPurchase.findUnique` still finds the purchase row (it's not deleted just because... actually if the User was Cascade-deleted, the ChatPackPurchase row would ALSO be gone via Cascade, so `findUnique` returns `null` and the webhook falls through to the `Purchase`-based branch, which also finds nothing and does nothing — no throw either way, both paths handled by existing `null`/`updateMany`-on-nothing safety.
- **Duplicate webhook delivery**: covered by the `chatPack.status !== "paid"` guard — second delivery is a no-op.
- **Membership lapses mid-session**: every `sendChatMessage` call re-checks `user.isComped || user.membershipStatus === "active"` fresh from the database — a page that was loaded while active but is now stale gets a clear rejection on the very next message, not a silently-broken UI.
- **OpenAI call fails/times out**: caught, returns a generic retry-style error, and critically does **not** reach the usage-logging/credit-decrement step — a failed call costs the member nothing.
- **ChatSettings missing**: `getChatSettings()`'s upsert transparently creates it with defaults on first access from either the admin page or `sendChatMessage`/`startQuestionPackCheckout` — no seed step, no error.
- **Long or oversized message history from the client**: server truncates to the last 12 messages and rejects any single message over 4000 characters, before ever calling OpenAI.

## Open questions

- None on the core mechanics — all confirmed directly with the site owner across this feature's planning discussion. One minor implementation latitude left to the coder: exactly how the chat widget displays the free-questions/credit count before the very first message of a session is sent (spec allows simply showing nothing until the first response arrives, since no edge case requires a pre-first-message count to be accurate).
