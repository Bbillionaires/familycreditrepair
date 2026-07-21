# Spec: Course content type (structured, multi-lesson, free/paid)

## Summary
Add a new `Course` content type parallel to the existing `Material` type, but structured: a Course contains multiple ordered `Lesson`s (each with optional text content, video, and/or downloadable file). Courses are managed from `/admin/courses` (+ nested lesson management), and follow the exact same free-vs-paid unlock mechanic Material already has — free courses require a lightweight name+email capture before granting access (not fully open), paid courses go through Stripe Checkout — except what's being unlocked is *viewing the course's lessons* on `/courses/[id]`, not downloading a single file. The existing `Purchase` model is made polymorphic (nullable `materialId`, new nullable `courseId`) rather than adding a parallel model, because `Purchase`'s two existing generic consumers (`src/app/api/stripe/webhook/route.ts`, which updates status purely by `stripeSessionId` with no material-specific logic, and the admin dashboard's purchase count) already operate generically enough that this is the lower-disruption path — the webhook needs zero changes.

User accounts do not exist yet (separate future task). Course access for now works exactly like Material's today: an anonymous email capture (free) or Stripe Checkout (paid) produces a `Purchase` row with a `downloadToken`, and that token — passed as a `?token=` query param — is what grants access to `/courses/[id]`, not a login session. **Open note, not a blocker:** once user accounts exist, course access should migrate to being tied to the logged-in user (a "my courses" library) instead of a URL token. Do not build that now.

## Files to change

### `prisma/schema.prisma`
- Change: add two new models, and make `Purchase.materialId` optional while adding an optional `courseId`.
- Signatures:
  ```prisma
  model Course {
    id          String     @id @default(cuid())
    title       String
    description String
    priceCents  Int        @default(0)
    imageUrl    String?
    published   Boolean    @default(true)
    sortOrder   Int        @default(0)
    createdAt   DateTime   @default(now())
    updatedAt   DateTime   @updatedAt
    lessons     Lesson[]
    purchases   Purchase[]
  }

  model Lesson {
    id        String   @id @default(cuid())
    course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
    courseId  String
    title     String
    order     Int      @default(0)
    content   String?
    videoUrl  String?
    fileUrl   String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([courseId])
  }
  ```
  Modify the existing `Purchase` model:
  ```prisma
  model Purchase {
    id              String    @id @default(cuid())
    material        Material? @relation(fields: [materialId], references: [id])
    materialId      String?
    course          Course?   @relation(fields: [courseId], references: [id])
    courseId        String?
    name            String
    email           String
    amountCents     Int
    stripeSessionId String    @unique
    status          String    @default("pending")
    downloadToken   String    @unique
    createdAt       DateTime  @default(now())

    @@index([materialId])
    @@index([courseId])
  }
  ```
  (`materialId` changes from required to optional; everything else on `Purchase` is unchanged. Do not rename `downloadToken` — for Course purchases this same column is reused as a generic "access token," not a file-download token; this is intentional to avoid an unnecessary schema/rename churn, not an oversight.)
- After editing the schema, run `npx prisma migrate dev --name add_courses` against a real reachable Postgres (matching how the SQLite→Postgres migration in an earlier task was generated) to produce the actual migration SQL — do not hand-write migration SQL.

### `src/lib/storage.ts`
- Change: add two new functions mirroring the existing `saveMaterialFile`/`resolveMaterialFilePath` exactly, for lesson file attachments, using a sibling `storage/lessons` directory (not `storage/materials`) — do not generalize/parameterize the existing functions, add new dedicated ones matching this codebase's existing convention of one dedicated pair per content type.
- Signatures:
  ```ts
  const LESSON_STORAGE_ROOT = path.join(process.cwd(), "storage", "lessons");
  export async function saveLessonFile(file: File): Promise<string>
  export function resolveLessonFilePath(key: string): string
  ```

### `src/app/admin/courses/actions.ts` (new file)
- Change: `createCourse`, `updateCourse`, `deleteCourse` — mirror `src/app/admin/materials/actions.ts`'s `createMaterial`/`updateMaterial`/`deleteMaterial` exactly (same Zod schema shape adapted to Course fields: `title`, `description`, `priceDollars` → `priceCents`, `published`; Course has no `fileUrl`/`externalFileUrl` fields at the course level — those belong to Lessons, not Courses — so omit that part of Material's schema; keep the optional `image` file upload exactly as Material has it, saved to `public/uploads/courses/` this time). `requireAdmin()` at the top of every action. `revalidatePath("/courses")` and `revalidatePath("/")` after create/update/delete, plus `revalidatePath("/admin/courses")` after delete (matching Material's exact revalidation set).
- Signatures:
  ```ts
  export type CourseFormState = { error?: string } | undefined;
  export async function createCourse(_prevState: CourseFormState, formData: FormData): Promise<CourseFormState>
  export async function updateCourse(id: string, _prevState: CourseFormState, formData: FormData): Promise<CourseFormState>
  export async function deleteCourse(id: string): Promise<void>
  ```

### `src/app/admin/courses/course-form.tsx` (new file)
- Change: mirror `src/app/admin/materials/material-form.tsx` exactly, minus the file/externalFileUrl fields (Courses don't have a file at the course level), keeping title/description/priceDollars/image/published.
- Signatures: same shape as `MaterialForm` — `{ action, submitLabel, defaultValues }` props.

### `src/app/admin/courses/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` (new files)
- Change: mirror the three equivalent Material admin pages exactly (list with edit/delete links + published/draft badge; new; edit). The list page additionally needs a link per row to `/admin/courses/[id]/lessons` (label: "Manage lessons") alongside the existing Edit/Delete links, since lessons are managed on a separate nested page, not inline on this list.

### `src/app/admin/courses/[id]/lessons/actions.ts` (new file)
- Change: `createLesson`, `updateLesson`, `deleteLesson`, `reorderLesson` — mirror the Material CRUD action pattern, scoped to a given `courseId`. Content/videoUrl/fileUrl are all optional (a lesson can have any combination, including none — that's a valid lesson with just a title, e.g. an intro/overview lesson). File upload works exactly like Material's: an uploaded `file` field takes priority, else an `externalFileUrl` field, else (on update) keep the existing `fileUrl`; on create, if neither is provided, `fileUrl` is simply left `null` (unlike Material, a Lesson does NOT require a file — do not replicate Material's "must have a file or link" validation error here, since lessons are valid without one).
- Signatures:
  ```ts
  export type LessonFormState = { error?: string } | undefined;
  export async function createLesson(courseId: string, _prevState: LessonFormState, formData: FormData): Promise<LessonFormState>
  export async function updateLesson(lessonId: string, _prevState: LessonFormState, formData: FormData): Promise<LessonFormState>
  export async function deleteLesson(lessonId: string, courseId: string): Promise<void>
  ```
  `deleteLesson` needs `courseId` (unlike `deleteMaterial`) purely so it can `revalidatePath` the right nested admin page after deleting.
- Revalidation: `revalidatePath(`/courses/${courseId}`)` and `revalidatePath(`/admin/courses/${courseId}/lessons`)` after every mutation (no top-level `/courses` list revalidation needed here — the course list page doesn't show lesson content).

### `src/app/admin/courses/[id]/lessons/page.tsx`, `new/page.tsx`, `[lessonId]/edit/page.tsx` (new files)
- Change: mirror `src/app/admin/classes/[id]/signups/page.tsx`'s nesting pattern (a sub-page scoped to a parent course, with a "&larr; Back to courses" link at the top) combined with the standard list/new/edit CRUD trio. The list page (`lessons/page.tsx`) shows lessons in `order` ascending, each with title, a truncated preview of content (if any), indicators for whether video/file are attached, and Edit/Delete links; plus an "Add lesson" link.

### `src/lib/format.ts`
- Change: none required — `formatMoney` already exists and is reused as-is for Course pricing display, same as Material.

### `src/components/course-card.tsx` (new file)
- Change: mirror `src/components/material-card.tsx` exactly (expand-to-inline-unlock-form pattern, `isFree` branch choosing between `requestFreeCourseAccess`/`startCourseCheckout`), with one addition: the course title is a `<Link href={`/courses/${course.id}`}>` (Material's card title is plain text since Material has no detail page — Course needs one, so this is an intentional, justified difference, not an inconsistency to "fix" on Material).
- Signatures:
  ```ts
  type Course = { id: string; title: string; description: string; priceCents: number; imageUrl: string | null };
  export default function CourseCard({ course }: { course: Course })
  ```

### `src/app/courses/actions.ts` (new file)
- Change: `requestFreeCourseAccess`, `startCourseCheckout` — mirror `src/app/materials/actions.ts`'s `requestFreeDownload`/`startMaterialCheckout` exactly, with these differences: create the `Purchase` row with `courseId` set and `materialId` omitted (left `undefined`/absent, not explicitly `null` — Prisma treats an omitted optional relation scalar as `null` automatically); on success, `redirect(`/courses/${courseId}?token=${downloadToken}`)` instead of `/api/download/...`; Stripe checkout's `success_url` becomes `${origin}/courses/success?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}` and `cancel_url` becomes `${origin}/courses`.
- Signatures:
  ```ts
  export type CourseActionState = { error?: string } | undefined;
  export async function requestFreeCourseAccess(courseId: string, _prevState: CourseActionState, formData: FormData): Promise<CourseActionState>
  export async function startCourseCheckout(courseId: string, _prevState: CourseActionState, formData: FormData): Promise<CourseActionState>
  ```

### `src/app/courses/page.tsx` (new file)
- Change: mirror `src/app/materials/page.tsx` exactly — `export const dynamic = "force-dynamic"`, split into "Free courses" / "Paid courses" sections using the same `Section` sub-component pattern, empty-state message when no published courses exist.

### `src/app/courses/[id]/page.tsx` (new file)
- Change: new page, the core of the access-gating logic.
- Signatures/behavior:
  ```ts
  export default async function CoursePage({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ token?: string }>;
  })
  ```
  1. Load the course by `id` (404 via `notFound()` if missing or `!published`).
  2. Read `token` from `searchParams`. If present, look up `db.purchase.findUnique({ where: { downloadToken: token } })`. Access is granted (`hasAccess = true`) only if that purchase's `courseId === course.id` AND `status === "paid"`. Any other case (no token, token doesn't match, wrong course, unpaid) → `hasAccess = false`. Do not leak whether a token was "close but wrong" vs. "missing" in the UI — same locked view either way.
  3. If `!hasAccess`: render the course title, description, price, and a syllabus list of lesson **titles only** (order ascending) — no content/video/file — plus the unlock UI: if `priceCents === 0`, a name+email form calling `requestFreeCourseAccess`; if paid, a name+email form calling `startCourseCheckout`. (This is effectively `CourseCard`'s unlock form re-embedded in a full-page layout, not a re-import of the card component itself — keep it inline here, matching how `SignupForm`/similar single-purpose form components are colocated with their page today rather than forced into a shared component prematurely.)
  4. If `hasAccess`: render all lessons in `order` ascending, each showing its title, its `content` (if present, split on `"\n\n"` into separate `<p>` tags — this codebase has no rich-text rendering convention yet, plain paragraph splitting is the intentional, minimal choice), its video (via the existing `VideoEmbed` component, reusing `src/lib/video.ts`'s `toEmbedUrl`, if `videoUrl` is present), and a download link to `/api/courses/${course.id}/lessons/${lesson.id}/file?token=${token}` (if `fileUrl` is present).

### `src/app/courses/success/page.tsx` (new file)
- Change: mirror `src/app/materials/success/page.tsx` exactly, with `searchParams` typed as `Promise<{ session_id?: string; course_id?: string }>`, and the final success state's link/button pointing to `/courses/${course_id}?token=${purchase.downloadToken}` (labeled "Start your course") instead of `/api/download/...`. If `course_id` is missing from the query string, fall back to linking to `/courses` generally rather than erroring — this is defensive only, the checkout flow this spec builds always includes it.

### `src/app/api/courses/[id]/lessons/[lessonId]/file/route.ts` (new file)
- Change: new Route Handler, mirrors `src/app/api/download/[token]/route.ts`'s file-serving logic (redirect for `http(s)://` URLs, else read from private storage and stream with `Content-Disposition: attachment`) but takes its access token from a `?token=` **query parameter** (not a path segment, since this route's identity is the lesson, and access is proven separately) — because a single course purchase must be able to unlock every lesson's file, not just one specific token-keyed row per file.
- Signatures:
  ```ts
  export async function GET(
    request: Request,
    ctx: RouteContext<"/api/courses/[id]/lessons/[lessonId]/file">
  )
  ```
  Logic: read `token` from `new URL(request.url).searchParams`. Look up the `Lesson` by `lessonId`, include its `course`. 404 if the lesson doesn't exist or has no `fileUrl`. Look up `Purchase` by `downloadToken: token`; 404 (not 403 — do not distinguish "wrong token" from "lesson doesn't exist" in the response, matching the existing download route's behavior of a flat 404 for any invalid-access case) unless `purchase.courseId === lesson.courseId && purchase.status === "paid"`. Otherwise serve `lesson.fileUrl` exactly like the existing route serves `material.fileUrl`.

### `src/components/site-header.tsx`
- Change: add one entry to `links`, after the `/free-credit-reports` entry (last in the list, continuing the established append-at-the-end pattern).
- Signature: `{ href: "/courses", label: "Courses" }`. (Known, accepted, already-flagged limitation: this is now a 6th nav item and mobile crowding continues to not be addressed — still out of scope, per the prior task's precedent.)

### `src/components/site-footer.tsx`
- Change: add a matching `<li>` to the "Explore" list, after the `/free-credit-reports` entry.
- Signature: `<li><Link href="/courses" className="hover:text-slate-900">Courses</Link></li>`

### `src/app/admin/layout.tsx`
- Change: add one entry to `links`, after `/admin/classes`.
- Signature: `{ href: "/admin/courses", label: "Courses" }`

### `src/app/admin/page.tsx`
- Change: the existing `paidPurchaseCount` query (`db.purchase.count({ where: { status: "paid", amountCents: { gt: 0 } } })`) currently counts ALL paid purchases regardless of type, and is labeled "Paid materials sold" — after this change that label would be misleading since it would silently include course sales too. Split into two counts and two cards.
- Signatures: replace the single `paidPurchaseCount` query with two:
  ```ts
  db.purchase.count({ where: { status: "paid", amountCents: { gt: 0 }, materialId: { not: null } } }),
  db.purchase.count({ where: { status: "paid", amountCents: { gt: 0 }, courseId: { not: null } } }),
  ```
  Also add `db.course.count()` alongside the existing `materialCount` query. Add two cards: `{ href: "/admin/courses", label: "Courses", value: courseCount }` and `{ href: "/admin/courses", label: "Paid courses sold", value: paidCoursePurchaseCount }`, alongside the existing (now more precisely still-correctly-labeled) `{ href: "/admin/materials", label: "Paid materials sold", value: paidMaterialPurchaseCount }`.

## Edge cases
- **Free course access is still gated by a name+email capture**, not fully open — matching Material's existing behavior exactly. A visitor cannot see lesson content without going through the (instant, no-payment) unlock form first.
- **Locked course page never reveals lesson content/video/file, only titles.** Verify this by checking the actual rendered HTML in the no-access branch contains no `content`/`videoUrl`/lesson-file-link output at all, not just that it's visually hidden via CSS.
- **A course with zero lessons**: still valid to publish (e.g. "coming soon" or admin still adding content) — the unlocked view just renders an empty lessons list; don't treat zero lessons as an error state.
- **`Purchase.materialId` now optional**: existing Material-purchase code paths (`src/app/materials/actions.ts`, the Stripe webhook, `/api/download/[token]/route.ts`) must continue working completely unchanged — they always set `materialId` and never touch `courseId`, so they're unaffected by the schema change, but confirm this by re-running the existing material purchase flow (free download + a real or simulated Stripe checkout) after migrating, not just assuming it.
- **Course Stripe checkout while Stripe isn't configured**: mirror Material's exact behavior — `startCourseCheckout` returns the same-style friendly error ("Online payments aren't set up yet...") via `isStripeConfigured()`, does not attempt checkout.
- **Lesson with a file but no video/content, or vice versa, or none of the three**: all valid; nothing to enforce beyond `title` being required.
- **Lesson file download token mismatch or wrong course**: flat 404, no information disclosure about which part failed (matches existing download route's posture).
- **Deleting a Course that has existing Purchases**: same posture as `deleteMaterial` today (no special handling exists there either — a FK constraint will raise if Postgres's default `RESTRICT` blocks it, and that's accepted existing behavior for Material too, not something to newly solve for Course).
- **Reordering lessons**: no drag-and-drop UI; admin sets an integer `order` value per lesson via a plain number input on the lesson form, same pattern as other manually-ordered fields in this codebase (e.g. `sortOrder` elsewhere). Accepted simplification, not a gap to fill now.

## Dependencies / config changes
- No new npm packages.
- One new database migration (`add_courses`) — generate it with `prisma migrate dev` against a real reachable Postgres, do not hand-write it, following the same process used for the original SQLite→Postgres migration.
- No new environment variables.

## Open questions
- None on the mechanics of this task. Restating the two explicitly out-of-scope items already agreed with the site owner so they aren't accidentally attempted mid-implementation: (1) no user accounts/login — course access stays anonymous-token-based for now; (2) no quiz/certificate integration — Courses and the future quiz system are unrelated in this pass.
