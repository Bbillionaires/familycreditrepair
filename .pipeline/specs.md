# Spec: 1-on-1 mentoring request (request-then-approve, no booking/payment)

## Summary

Add a "Request a 1-on-1 session" feature: a public form where a visitor picks an active mentor from a dropdown, describes what they need and their preferred time(s), checks a (placeholder) consent box, and submits. Nothing is auto-booked — every request sits as `"pending"` until an admin explicitly Approves or Declines it from a new admin list page. Mentors are a new admin-managed entity (name, a company-controlled email the site owner provisions separately, an informational session rate, an active flag, and a per-mentor "also notify this mentor by email" toggle). On submit, the admin is always emailed; the mentor is additionally emailed if that mentor's `notifyMentorOnRequest` flag is on. On approve/decline, the requester is emailed the outcome. All email sends reuse the existing `src/lib/email.ts` Resend integration and its established degrade-gracefully-if-not-configured behavior — never a hard requirement, never a crash if `RESEND_API_KEY` is unset. No calendar/slot-booking UI, no email relay/masking, no payment collection — all explicitly out of scope, confirmed with the site owner.

## Out of scope — do not build

- Real-time calendar/slot-booking UI.
- Email relay/masking/inbound-parsing system (mentors use company-controlled mailboxes, provisioned outside this codebase).
- Payment collection tied to mentoring sessions (rate is informational only).
- AI chat, quiz, or certificate work — separate, later tasks.
- Real legally-binding agreement text — see the placeholder note in the `MentorRequestForm` section below.

## Files to change

### `prisma/schema.prisma`

Two new models, following this repo's established conventions (`cuid()` ids, `createdAt`/`updatedAt`, plain-string `status` fields like `Purchase.status`/`User.membershipStatus` rather than a Prisma enum):

```prisma
model Mentor {
  id                  String          @id @default(cuid())
  name                String
  email               String
  bio                 String?
  sessionRateCents     Int?
  notifyMentorOnRequest Boolean       @default(false)
  active              Boolean         @default(true)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  requests            MentorRequest[]
}

model MentorRequest {
  id             String   @id @default(cuid())
  mentor         Mentor?  @relation(fields: [mentorId], references: [id], onDelete: SetNull)
  mentorId       String?
  name           String
  email          String
  preferredTimes String
  message        String?
  agreedToTerms  Boolean
  status         String   @default("pending")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([mentorId])
}
```

- **`mentorId` is nullable with `onDelete: SetNull`** (not `Restrict`, not `Cascade`) — deliberately mirroring the `Purchase.materialId`/`courseId` precedent already established in this repo. Rationale: a `MentorRequest` is itself a record of "someone asked to meet with mentor X" — valuable for the site owner's own stated accountability/transparency goals even after that mentor is later removed from the roster. Deleting the mentor should never silently destroy that history (`Cascade` would), and it shouldn't block an admin from removing a mentor who's left (`Restrict` would). `SetNull` keeps every request visible in the admin list with its own name/email/message intact; only the `mentor` relation itself becomes unset, and the admin UI must handle `request.mentor === null` by displaying something like "(mentor removed)" — specified below.
- `sessionRateCents` is nullable (`null` or `0` both mean "free/not set" for this feature — informational display only, no charging logic anywhere reads this field for payment purposes).
- Generate the migration the same way prior schema-changing tasks in this repo did (non-interactive `prisma migrate dev` doesn't work in this environment): run `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_add_mentor_and_mentor_request/migration.sql` (create that directory first), then `npx prisma migrate deploy`, then `npx prisma generate`.

### `src/lib/site.ts`

No new disclaimer string needed here — the placeholder agreement text lives directly in the form component (see below) since it's explicitly temporary/not-final copy, unlike the site's other permanent disclaimers.

### `src/app/mentoring/actions.ts` (new file)

`"use server"`, following `src/app/calendar/actions.ts`'s Zod/validation conventions and `src/app/account/forgot-password/actions.ts`'s exact Resend send pattern (`isResendConfigured()` guard, `getResend().emails.send({...})`, `console.error(...)` fallback when not configured — copy this shape exactly, do not invent a new one).

```ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getResend, isResendConfigured, EMAIL_FROM } from "@/lib/email";

const MentorRequestSchema = z.object({
  mentorId: z.string().trim().min(1, "Please choose a mentor"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  preferredTimes: z.string().trim().min(1, "Let us know what times work for you"),
  message: z.string().trim().optional(),
  agreedToTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to continue" }) }),
});

export type MentorRequestFormState = { error?: string; success?: boolean } | undefined;

export async function createMentorRequest(
  _prevState: MentorRequestFormState,
  formData: FormData
): Promise<MentorRequestFormState>
```

**`createMentorRequest` behavior:**
1. Parse `formData` with `MentorRequestSchema` (`agreedToTerms` comes from a checkbox: `formData.get("agreedToTerms") === "on"`, matching `ClassSchema`'s `published: formData.get("published") === "on"` convention — convert to boolean before validating against `z.literal(true)`, don't pass the raw string through). Return `{ error: ... }` on failure, mirroring every other action in this codebase.
2. `const mentor = await db.mentor.findUnique({ where: { id: parsed.data.mentorId } }); if (!mentor || !mentor.active) return { error: "This mentor is no longer available. Please choose another." };` — handles both "mentor deleted" and "mentor deactivated after the page loaded" (stale dropdown) without throwing.
3. `const request = await db.mentorRequest.create({ data: { mentorId: mentor.id, name, email, preferredTimes, message, agreedToTerms: true, status: "pending" } });`
4. Email notifications (best-effort, never block success on send failure — wrap in the same `if (isResendConfigured())` pattern as forgot-password, and additionally don't let one send's failure prevent the other from attempting; use two independent `if` blocks, not one that returns early):
   - Always to the site's own admin contact. Since there is no existing "admin notification email address" env var anywhere in this codebase, add `ADMIN_NOTIFICATION_EMAIL` as a new optional env var (document it in `.env.example` — see below); if unset, skip the admin email and `console.error` a note, same degrade-gracefully spirit as the rest of this file.
     - Subject: `New 1-on-1 mentoring request`
     - Body (plain text, matching the terse style of the forgot-password email): `New request for ${mentor.name}:\n\nFrom: ${name} (${email})\nPreferred times: ${preferredTimes}\nMessage: ${message || "(none)"}\n\nReview and approve/decline at ${origin}/admin/mentoring` (reuse the exact `getSiteOrigin()` helper body from `materials/actions.ts`, duplicated locally per this repo's established per-file convention).
   - If `mentor.notifyMentorOnRequest`, also send the same email content to `mentor.email`.
5. `revalidatePath("/admin/mentoring")` (no public page needs revalidation since the public form doesn't list requests).
6. Return `{ success: true }`.

### `src/app/admin/mentoring/actions.ts` (new file)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { getResend, isResendConfigured, EMAIL_FROM } from "@/lib/email";

async function getSiteOrigin() { /* identical duplicated body */ }

export async function approveMentorRequest(requestId: string)
export async function declineMentorRequest(requestId: string)
```

**Both functions share this shape** (write as two functions, not one parameterized function, matching this repo's existing preference for explicit named actions like `createClass`/`updateClass` over one generic function):
1. `await requireAdmin();`
2. `const request = await db.mentorRequest.findUnique({ where: { id: requestId }, include: { mentor: true } }); if (!request) return;` — handles a stale/already-deleted row without throwing.
3. **Idempotency guard**: `if (request.status !== "pending") return;` — a request already approved/declined (double-click, or re-submission of a stale admin page) is a silent no-op, not a second email or an error. This is the concrete answer to "admin approves/declines a request twice."
4. `await db.mentorRequest.update({ where: { id: requestId }, data: { status: "approved" /* or "declined" */ } });`
5. Email the requester (best-effort, same `isResendConfigured()` guard):
   - Approve subject: `Your 1-on-1 session request was approved` / body: `Good news — your request to meet with ${request.mentor?.name ?? "a mentor"} was approved. They'll be in touch directly to arrange a time.` (only reachable if `request.mentor` is non-null at approval time in the normal flow, but written defensively per the SetNull edge case).
   - Decline subject: `Update on your 1-on-1 session request` / body: `Thanks for your interest — we're not able to move forward with this request right now.`
6. `revalidatePath("/admin/mentoring");`

### `src/app/admin/mentoring/page.tsx` (new file)

Single admin page listing **every** `MentorRequest` across all mentors (not nested under a specific mentor, per the site owner's explicit "admins need to see all pending requests at a glance" requirement) — follows `src/app/admin/classes/page.tsx`'s table styling exactly.

```tsx
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate } from "@/lib/format";
import { approveMentorRequest, declineMentorRequest } from "./actions";

export default async function AdminMentoringPage() {
  await requireAdmin();
  const requests = await db.mentorRequest.findMany({
    include: { mentor: true },
    orderBy: { createdAt: "desc" },
  });
  // table columns: Requester (name/email), Mentor (mentor?.name ?? "(mentor removed)"),
  // Preferred times, Status (badge), Requested (date), actions (Approve/Decline forms,
  // only rendered when status === "pending"; otherwise show nothing in that cell)
}
```

- Status badge colors, matching `admin/materials/page.tsx`'s Published/Draft convention: `"pending"` → amber (`bg-amber-100 text-amber-700`), `"approved"` → green (`bg-green-100 text-green-700`), `"declined"` → slate (`bg-slate-100 text-slate-500`).
- Action cell: two separate `<form action={approveMentorRequest.bind(null, r.id)}>`/`<form action={declineMentorRequest.bind(null, r.id)}>` with distinct submit buttons ("Approve" blue-ish text, "Decline" red text — matching the Edit/Delete link-button pairing style in `admin/materials/page.tsx`), rendered only `{r.status === "pending" && (...)}`; for non-pending rows, render nothing in that cell (or a muted em-dash) so an already-actioned row can't be re-submitted from the UI (belt-and-suspenders alongside the idempotency guard in the actions themselves).
- Empty state: `No mentoring requests yet.`, matching the `No classes yet.` convention.

### `src/app/admin/mentors/page.tsx` (new file), `src/app/admin/mentors/new/page.tsx`, `src/app/admin/mentors/[id]/edit/page.tsx`, `src/app/admin/mentors/actions.ts`, `src/app/admin/mentors/mentor-form.tsx`

Full CRUD for `Mentor`, replicating `admin/classes/`'s exact file layout and conventions 1:1 (list page with Edit/Delete + Active/Draft-style badge using the `active` boolean instead of `published`; `new`/`[id]/edit` pages both rendering the shared `MentorForm` client component with `action={createMentor}`/`action={updateMentor.bind(null, id)}`; `deleteMentor(id)` as a plain no-form-state action like `deleteClass`).

- `MentorSchema` (Zod): `name` (required string), `email` (required, valid email), `bio` (optional string), `sessionRateDollars` (optional `z.coerce.number().min(0)`, converted to `sessionRateCents` via `Math.round(data.sessionRateDollars * 100)` exactly like `MaterialSchema`'s `priceDollars`→`priceCents`, `undefined`/`0` input stored as `null`), `notifyMentorOnRequest` (`formData.get("notifyMentorOnRequest") === "on"`), `active` (`formData.get("active") === "on"`).
- `MentorForm` fields: Name, Email, Bio (optional textarea), Session rate in dollars (optional number input, labeled "Session rate (optional, informational only — not charged automatically)"), a checkbox "Also email this mentor directly when someone requests them", a checkbox "Active (visible on the public request form)".
- `deleteMentor(id)`: `await requireAdmin(); await db.mentor.delete({ where: { id } }); revalidatePath("/admin/mentors"); revalidatePath("/mentoring");` — deleting a Mentor is allowed even with existing `MentorRequest` rows (per the `SetNull` schema decision above); no confirmation dialog needed, matching this repo's existing delete-button convention (no existing delete action in this codebase has a confirm step).

### `src/app/admin/layout.tsx`

Add two nav entries: `{ href: "/admin/mentors", label: "Mentors" }` and `{ href: "/admin/mentoring", label: "Mentoring requests" }`, placed after `"Users"` and before `"Export"`.

### `src/app/mentoring/page.tsx` (new file)

Public page, following `src/app/materials/page.tsx`'s layout convention (`mx-auto max-w-*` container, `<h1>`, intro paragraph).

```tsx
import { db } from "@/lib/db";
import MentorRequestForm from "./mentor-request-form";

export const metadata = { title: "1-on-1 Mentoring" };
export const dynamic = "force-dynamic";

export default async function MentoringPage() {
  const mentors = await db.mentor.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  // renders intro copy + <MentorRequestForm mentors={mentors} />
}
```

- If `mentors.length === 0`, render a plain message instead of the form: `"1-on-1 mentoring isn't available to request right now — check back soon."` — the concrete answer to "no active mentors exist yet."
- Pass only the fields the form actually needs to the client component (`id`, `name`, `sessionRateCents`, `bio`) — do not pass `email` or any other field not needed client-side (there's nothing sensitive on `Mentor` today, but keep the prop surface minimal on principle, consistent with this being a public page).

### `src/app/mentoring/mentor-request-form.tsx` (new file)

`"use client"`, following `src/app/calendar/signup-form.tsx`'s `useActionState` structure.

```tsx
"use client";

import { useActionState } from "react";
import { createMentorRequest } from "./actions";
import { formatMoney } from "@/lib/format";

type MentorOption = { id: string; name: string; sessionRateCents: number | null; bio: string | null };

export default function MentorRequestForm({ mentors }: { mentors: MentorOption[] }) {
  const [state, formAction, pending] = useActionState(createMentorRequest, undefined);
  // ...
}
```

- Fields: a `<select name="mentorId">` populated from `mentors` (option label: `${m.name}${m.sessionRateCents ? \` — \${formatMoney(m.sessionRateCents)}/session\` : " — Free"}`), Name, Email, "Preferred times" (`<textarea name="preferredTimes" placeholder="e.g. Weekday evenings, or Tuesday/Thursday after 6pm">`), "What do you need help with?" (`<textarea name="message">`, optional), and a checkbox `<input type="checkbox" name="agreedToTerms" required>` next to the following text, wrapped in a code comment immediately above it in the source:

```tsx
{/* PLACEHOLDER — this is not final legal agreement text. Replace with
    lawyer-reviewed consent/agreement copy before this form is used with
    real members, especially given CROA considerations for 1-on-1 credit
    consulting. Do not treat this wording as legally sufficient. */}
<label className="flex items-start gap-2 text-sm text-slate-600">
  <input type="checkbox" name="agreedToTerms" required className="mt-1" />
  I understand this request does not guarantee a session, that a mentor or
  admin must approve it first, and I agree to the terms of participating in
  a 1-on-1 session (placeholder — final agreement pending legal review).
</label>
```

- On `state?.success`, render a confirmation message instead of the form (matching `calendar/signup-form.tsx`'s pattern of swapping the whole form out for a success message): `"Request sent! We'll follow up by email once it's reviewed — this doesn't book anything automatically."`
- On `state?.error`, render it in the same `text-sm text-red-600` style used everywhere else.

### `.env.example`

Add, in the same commented style as the existing entries:

```
# Optional: only needed to receive an email when someone submits a 1-on-1
# mentoring request (src/app/mentoring). If unset, requests still save
# normally — you'll just need to check /admin/mentoring manually.
ADMIN_NOTIFICATION_EMAIL=""
```

### Site nav (optional link placement — open question, see below)

No footer/header link is specified as required; the planner leaves this as an open question below rather than guessing where the site owner wants public discoverability of `/mentoring`.

## Edge cases

- **Submitting a request for an inactive or deleted mentor**: `createMentorRequest` re-fetches the mentor server-side and checks `!mentor || !mentor.active`, returning a clear error — never trusts the client-submitted dropdown value as proof the mentor is still valid/active.
- **Admin approves/declines a request twice**: `if (request.status !== "pending") return;` guard in both actions — second click is a silent no-op, no duplicate email, no error.
- **Resend not configured**: request submission and approve/decline all still succeed and persist to the database; every email send is wrapped in `isResendConfigured()` exactly like `forgot-password/actions.ts`, with a `console.error` fallback instead of a thrown error.
- **No active mentors exist**: `/mentoring` shows a plain "not available right now" message instead of an empty/broken dropdown.
- **Admin deletes a Mentor with existing requests**: allowed; `onDelete: SetNull` keeps every `MentorRequest` row intact with `mentorId` set to `null`; the admin requests list renders `"(mentor removed)"` in that case (both list page and the approve/decline confirmation email body handle `mentor` being `null` defensively, per the exact wording specified above).
- **Long free-text `message`/`preferredTimes`**: no length cap — consistent with this codebase's existing text fields (`Signup.notes`, `Purchase` fields, etc.), none of which impose one at the Zod layer today. Do not introduce new validation the rest of the app doesn't already have.
- **`agreedToTerms` must be true to submit**: enforced via `z.literal(true)` server-side (not just a client-side `required` attribute) — a request can never be created with this false, matching this codebase's general pattern of never trusting client-side-only validation for anything written to the database.

## Open questions

- **Public discoverability of `/mentoring`**: the spec doesn't add a link to it from the main nav, footer, or homepage — the site owner didn't specify where this page should be reachable from. Recommend adding a link during/after this build once the owner sees the page (e.g., alongside "Classes & Calendar" in the header, or from `/account`), but implementing that placement now would be guessing; flagging rather than silently deciding.
- **`Mentor.bio` field**: included in the schema per the planner's judgment (useful context for a visitor choosing between mentors) but the site owner never explicitly asked for it. Low-risk inclusion — cheap to leave unused (just an optional textarea) if it turns out not to be wanted; flagging since it wasn't explicitly requested.
