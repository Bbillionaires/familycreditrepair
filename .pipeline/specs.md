# Spec: My Account dashboard (linked Materials, Courses, Class Signups)

## Summary
Replace the current bare `/account` page (username, email, change-password form, logout) with a real dashboard that also shows the logged-in visitor's unlocked Materials, unlocked Courses, and class signups — the "my courses" feature explicitly deferred when the Course feature and User-accounts feature were originally built. `Purchase` and `Signup` rows are keyed by a free-text `email` field, not a `userId` foreign key, and were created anonymously before accounts existed. Link them to the logged-in user by querying `Purchase.email`/`Signup.email` against the current session's own `User.email` — always the user's own verified, authenticated email, never a user-supplied lookup value, so this is safe: a visitor only ever sees rows matching their own account. **No schema migration is needed or being made.** Confirmed by reading `src/app/materials/actions.ts`, `src/app/courses/actions.ts`, and `src/app/calendar/actions.ts`: their `EmailSchema` is `z.string().trim().email(...)` with **no `.toLowerCase()`**, unlike `User.email` which the signup flow normalizes to lowercase. This means historical `Purchase`/`Signup` rows may have mixed-case emails while `User.email` is always lowercase — so every lookup in this feature must use a case-insensitive match (Prisma's `{ equals: ..., mode: "insensitive" }`, supported on this Postgres datasource) rather than an exact-string match. This is a read-time fix; do not add a migration or attempt to normalize existing data.

## Files to change

### `src/app/account/page.tsx`
- Change: extend `AccountPage` to fetch the user's unlocked Materials, unlocked Courses, and class Signups (three parallel queries via `Promise.all`), dedupe/sort/split them in plain JS, and render three new sections between the existing account-info block and the existing "Change password" block. The account-info block, change-password block, and logout form are unchanged — do not modify `change-password-form.tsx` or `actions.ts`.
- New queries, added after the existing `db.user.findUnique` call and its `if (!user) return null;` guard:
  ```ts
  const [materialPurchases, coursePurchases, signups] = await Promise.all([
    db.purchase.findMany({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "paid",
        materialId: { not: null },
      },
      include: { material: true },
      orderBy: { createdAt: "desc" },
    }),
    db.purchase.findMany({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "paid",
        courseId: { not: null },
      },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    }),
    db.signup.findMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      include: { classSession: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  ```
  Only `status: "paid"` rows are included for Materials/Courses — this is the sole "access granted" value in this codebase (confirmed via `/api/download/[token]/route.ts`'s own gate, `purchase.status !== "paid"`, and the Stripe webhook, which only ever sets `status: "paid"` on `checkout.session.completed` with `payment_status === "paid"`; free instant-unlocks also write `status: "paid"` directly). Rows with `status: "pending"` (checkout started, never completed) are deliberately excluded — a visitor who abandoned checkout should not see a phantom "purchase" they never completed.
- Dedupe logic (plain JS, no extra query), added right after the `Promise.all`:
  ```ts
  const materials = dedupeByKey(materialPurchases.filter((p) => p.material !== null), (p) => p.materialId!);
  const courses = dedupeByKey(coursePurchases.filter((p) => p.course !== null), (p) => p.courseId!);
  ```
  where `dedupeByKey` is a small local helper (defined in this file, not exported):
  ```ts
  function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  ```
  Since both source arrays are already ordered `createdAt: "desc"`, the first occurrence of a given `materialId`/`courseId` kept by this filter is always the most recently created `Purchase` row for that item — this is the intended "if unlocked twice, show the most recent one" behavior. The `.filter((p) => p.material !== null)` (and the `course` equivalent) step is what handles a `Purchase` whose linked `Material`/`Course` was since deleted: deleting a `Material`/`Course` sets `Purchase.materialId`/`courseId` to `null` (confirmed existing `onDelete: SetNull` behavior on this schema — see `.pipeline/review.md` from the Course feature task), so `materialId: { not: null }` in the query already excludes those, and this `.material !== null` check is a second, defensive layer against the same case. **Do not render a "no longer available" placeholder row — skip it entirely.** A `Material`/`Course` that's merely `published: false` (not deleted) still has a non-null relation and is NOT filtered out here, matching the existing `/api/download/[token]` route's own behavior of not checking `published` at all — a visitor who already has legitimate access keeps it regardless of the item's current public-listing status.
- Class signups split logic, added after the dedupe block:
  ```ts
  const now = new Date();
  const upcomingSignups = signups
    .filter((s) => s.classSession.startsAt >= now)
    .sort((a, b) => a.classSession.startsAt.getTime() - b.classSession.startsAt.getTime());
  const pastSignups = signups
    .filter((s) => s.classSession.startsAt < now)
    .sort((a, b) => b.classSession.startsAt.getTime() - a.classSession.startsAt.getTime());
  ```
  Upcoming: soonest first. Past: most-recently-happened first. Every `Signup` row's `classSession` is guaranteed non-null (the schema's `ClassSession → Signup` relation is `onDelete: Cascade`, so a `Signup` can never outlive its `ClassSession`) — no null-check needed here, unlike Materials/Courses.
- Rendering, inserted between the existing account-info `<div>` and the existing `<div className="mt-8"><h2>Change password</h2>...` block:
  ```tsx
  <div className="mt-8">
    <h2 className="text-lg font-semibold text-slate-900">My materials</h2>
    {materials.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">
        You haven&apos;t unlocked any materials yet.{" "}
        <Link href="/materials" className="text-blue-600 hover:underline">Browse the library</Link>.
      </p>
    ) : (
      <div className="mt-3 space-y-2">
        {materials.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{p.material!.title}</p>
            <a href={`/api/download/${p.downloadToken}`} className="text-sm font-medium text-blue-600 hover:underline">
              Download
            </a>
          </div>
        ))}
      </div>
    )}
  </div>

  <div className="mt-8">
    <h2 className="text-lg font-semibold text-slate-900">My courses</h2>
    {courses.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">
        You haven&apos;t unlocked any courses yet.{" "}
        <Link href="/courses" className="text-blue-600 hover:underline">Browse courses</Link>.
      </p>
    ) : (
      <div className="mt-3 space-y-2">
        {courses.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{p.course!.title}</p>
            <Link href={`/courses/${p.courseId}?token=${p.downloadToken}`} className="text-sm font-medium text-blue-600 hover:underline">
              View course
            </Link>
          </div>
        ))}
      </div>
    )}
  </div>

  <div className="mt-8">
    <h2 className="text-lg font-semibold text-slate-900">My class signups</h2>
    {upcomingSignups.length === 0 && pastSignups.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">
        You haven&apos;t signed up for any classes yet.{" "}
        <Link href="/calendar" className="text-blue-600 hover:underline">See the calendar</Link>.
      </p>
    ) : (
      <>
        {upcomingSignups.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-slate-500">Upcoming</p>
            <div className="mt-2 space-y-2">
              {upcomingSignups.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">{s.classSession.title}</p>
                  <p className="text-sm text-slate-500">{formatClassDate(s.classSession.startsAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {pastSignups.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Past</p>
            <div className="mt-2 space-y-2">
              {pastSignups.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 p-4 opacity-70">
                  <p className="font-medium text-slate-900">{s.classSession.title}</p>
                  <p className="text-sm text-slate-500">{formatClassDate(s.classSession.startsAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )}
  </div>
  ```
  Add `import Link from "next/link";` and `import { formatClassDate } from "@/lib/format";` to the top of the file (both already exist as shared utilities — `formatClassDate` is defined in `src/lib/format.ts` and used identically in `src/app/page.tsx`/`src/app/admin/classes/page.tsx`). The Materials "Download" link uses a plain `<a>` tag (not `next/link`) because it points at `/api/download/[token]`, a non-navigational API route that returns a file/redirect — mirrors the exact same choice already made in `src/app/materials/success/page.tsx`. The Courses "View course" link uses `next/link`'s `Link` because `/courses/[id]` is a real page — mirrors `src/app/materials/success/page.tsx`'s course-equivalent pattern isn't present, but matches how `startCourseCheckout`'s own `redirect()` target and every other in-app link to a real page in this codebase uses `Link`/`redirect`, never a plain `<a>`.

## Edge cases
- **User has zero purchases and zero signups**: each of the three sections independently shows its own empty state with a link to browse — never blank space, never a shared/combined empty state.
- **A Material/Course purchase exists but the item was since deleted**: `Purchase.materialId`/`courseId` is already `null` (existing `onDelete: SetNull` behavior), excluded by the query's own `{ not: null }` filter and the dedupe step's null-check. Not rendered at all — no placeholder row.
- **A Material/Course purchase exists and the item is merely unpublished (not deleted)**: still shown and still linked — access already granted, matching the existing `/api/download/[token]` route's behavior of not checking `published`.
- **Duplicate purchases of the same Material/Course** (e.g., a visitor unlocked the same free material twice, producing two `Purchase` rows): only the most recently created one is shown, via the dedupe-by-key step. The older row's `downloadToken` still works if someone has it bookmarked (nothing about this dashboard invalidates it) — this dashboard just doesn't display a redundant second row for it.
- **A class signup for a class that already happened**: shown in the "Past" section, visually de-emphasized (`opacity-70`), sorted most-recent-past-first. Not hidden — a visitor may want to see their own attendance history.
- **Email case mismatch between an anonymous purchase/signup and the account's normalized-lowercase email** (e.g., visitor typed `Jane@Example.com` at checkout, then later signed up for an account with `jane@example.com`): handled by `mode: "insensitive"` on every one of the three queries — confirmed necessary, not a hypothetical, since `Purchase`/`Signup`'s own `EmailSchema` never lowercases and `User.email` always does.
- **A Stripe checkout that's still `"pending"` (started, never completed, or webhook not yet received)**: never shown. Only `status: "paid"` rows are queried in the first place — no separate filtering-out step needed, it's built into the `where` clause.
- **A user with no `email` change mechanism in this app** (there is none — `User.email` is fixed at signup) — not an edge case requiring handling, just confirms the join key is stable for a given account's lifetime; noted for completeness, no code implication.

## Dependencies / config changes
None. No new npm packages, no schema changes, no new environment variables. Purely additive read queries against existing tables, using an existing Postgres feature (`mode: "insensitive"` string filtering) already supported by this datasource.

## Open questions
None. The one thing that looked like it might need a decision — whether email normalization required a data migration — was resolved by reading the actual write-path code: `Purchase`/`Signup` emails are genuinely never lowercased today, so a case-insensitive read is required and sufficient; no migration is being made or needed.
