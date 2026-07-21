# Spec: Free annual credit report info page

## Summary
Add a new static, informational public page at `/free-credit-reports` that
explains how to get free annual credit reports through the official,
federally-mandated AnnualCreditReport.com program (phone, web, and mail
channels), with a clear non-affiliation notice and a phishing warning. This
is explicitly the safe, non-automated version of a broader feature idea that
was rejected: **no automated bureau retrieval, no relaying of users'
security answers, no storage of any report/PII on this site.** The page is
pure static content — no database reads, no forms, no new dependencies, no
env vars. It follows the same layout/style conventions as
`src/app/calendar/page.tsx` and `src/app/testimonials/page.tsx`, and is
added to both the header nav and footer "Explore" list alongside the
existing three links.

## Files to change

### `src/lib/site.ts`
- Change: add two new string constants to the exported `site` object,
  following the existing flat-string-property pattern (no nested objects
  elsewhere in this file, keep it consistent).
- Signatures: add these two keys to the existing `export const site = { ... }`
  object, after `generalDisclaimer`:
  ```ts
  creditReportDisclaimer:
    "This page is educational only. We are not affiliated with Equifax, Experian, TransUnion, or AnnualCreditReport.com, and we never request, receive, or store your credit report, Social Security number, or any other personal identifying information on your behalf. The only official source for your free annual credit reports is annualcreditreport.com or 1-877-322-8228 — be wary of any other site or caller offering \"free credit reports\" that asks for payment or excessive personal information upfront.",
  ```
  (Exact wording above is final — do not paraphrase; it was carefully scoped
  to cover non-affiliation, no-PII-storage, and the phishing warning in one
  place. `generalDisclaimer` already exists and is reused as-is on the new
  page too, unchanged.)

### `src/components/disclaimer-banner.tsx`
- Change: make the banner's message content configurable via an optional
  `children` prop, defaulting to the current hardcoded
  `site.freeClassesDisclaimer` text so every existing call site (`home page`,
  `calendar page`) keeps rendering exactly what it renders today with zero
  changes needed at those call sites.
- Signatures:
  ```tsx
  export default function DisclaimerBanner({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-semibold">Good to know: </span>
        {children ?? site.freeClassesDisclaimer}
      </div>
    );
  }
  ```
- The new credit-report page uses `<DisclaimerBanner>{site.creditReportDisclaimer}</DisclaimerBanner>` instead of the no-args form.

### `src/app/free-credit-reports/page.tsx` (new file)
- Change: new Server Component page, static content only (no `db` import,
  no `"use client"`, no `dynamic` export needed since there's nothing
  dynamic to opt out of caching for).
- Structure (match `calendar/page.tsx`'s outer wrapper exactly: `<div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">`):
  1. `export const metadata = { title: "Free Credit Reports" };` (matches the
     `{ title: "..." }` pattern used in `calendar/page.tsx` and
     `materials/page.tsx` — do not add a description field, none of the
     existing pages set one beyond `title`).
  2. `<h1 className="text-3xl font-bold text-slate-900">` — heading text:
     "Get your free credit reports".
  3. Intro paragraph (`className="mt-2 text-slate-600"`, matching
     `calendar/page.tsx`'s intro paragraph style) stating: every U.S.
     consumer is entitled by federal law to one free copy of their credit
     report from each of the three nationwide bureaus (Equifax, Experian,
     TransUnion) every 12 months, through the official AnnualCreditReport.com
     program.
  4. `<DisclaimerBanner>{site.creditReportDisclaimer}</DisclaimerBanner>`
     wrapped in `<div className="mt-4">` (matches exactly how
     `calendar/page.tsx` wraps its `<DisclaimerBanner />`).
  5. A "How to order" section, `<div className="mt-8">` containing an
     `<h2 className="text-xl font-semibold text-slate-900">` "How to order"
     followed by three cards in a `<div className="mt-4 grid gap-4 sm:grid-cols-3">`
     grid (reuse the `rounded-lg border border-slate-200 p-4` card style used
     throughout `materials/page.tsx` and `page.tsx`'s home page sections —
     grep those files for the exact class string before writing this), one
     card per channel:
     - **Phone** — "1-877-322-8228" as the heading/emphasized text, body
       text: "A 3-minute call. Reports for all three bureaus arrive by mail
       within about 15 days."
     - **Online** — "annualcreditreport.com" as the heading/emphasized text
       (render as plain text, NOT as a clickable `<a href>` — seebelow),
       body text: "Request and often view your reports online the same day."
     - **Mail** — "Mail-in request form" as the heading, body text: "Print
       and mail the official request form if you'd rather not call or go
       online; also takes about 15 days by mail."
  6. Below the cards, a closing paragraph (`className="mt-8 text-sm text-slate-500"`)
     restating the phishing-warning half of `site.creditReportDisclaimer`
     is unnecessary to repeat in full — instead this paragraph just says:
     "Questions about a class or material? " with a `<Link href="/calendar">`
     to "check our class calendar" and/or `<Link href="/materials">` to
     "browse our resources" — mirroring the cross-link style already used in
     `page.tsx` (home page) section headers (e.g. "View all →" links). Keep
     this brief, one sentence.

### `src/components/site-header.tsx`
- Change: add one entry to the existing `links` array (no other changes to
  this file).
- Signatures: insert `{ href: "/free-credit-reports", label: "Free Credit Reports" }`
  into the `links` array, positioned after the `/calendar` entry (i.e. last
  in the list) — matches the existing order-of-addition pattern (each new
  section appended at the end).

### `src/components/site-footer.tsx`
- Change: add one `<li>` to the existing "Explore" `<ul>`, matching the exact
  markup pattern of the three existing `<li><Link ...>` entries.
- Signatures: add
  `<li><Link href="/free-credit-reports" className="hover:text-slate-900">Free Credit Reports</Link></li>`
  as the last item in that list.

## Edge cases

- **Do not hyperlink `annualcreditreport.com` or the phone number as `tel:`/`mailto:`/`href` links.** This is deliberate, not an oversight: rendering them as plain, non-clickable text avoids this page ever looking like it's redirecting users through an intermediary link (even to the real site) versus clearly telling them to go type/dial it themselves — keep it as plain text in both the card headings and anywhere else it appears.
- **No forms, no input fields, no client-side JavaScript on this page at all.** If you find yourself reaching for `"use client"` or any interactivity, stop — that's out of scope; this is a static content page only.
- **Mobile nav crowding**: adding a 5th entry to `site-header.tsx`'s `links` array will make the header nav visually tight on narrow viewports (the existing header has no overflow/hamburger handling for 5 items). This is a known, accepted cosmetic limitation for this change — do not redesign the header's responsive behavior as part of this task; that's out of scope.
- **Existing `DisclaimerBanner` call sites** (`src/app/page.tsx` home page, `src/app/calendar/page.tsx`) must render byte-for-byte identical output after this change — verify by confirming neither file needs to change at all (the default-`children`-to-`site.freeClassesDisclaimer` fallback handles this automatically).

## Dependencies / config changes
- None. No new npm packages, no database/schema changes, no new environment variables, no new routes beyond the one new page file.

## Open questions
- None.
