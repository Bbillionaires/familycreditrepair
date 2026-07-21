# Test report: Free annual credit report info page

## Tests added
- `src/lib/site.ts` did NOT exist as a `.test.ts` file before this change (no test framework existed in this repo at all — verified via `package.json` and a repo-wide search for `*.test.*`/`*.spec.*`, both came back empty).
- `src/lib/site.test.mjs` (new): 6 tests covering `site.creditReportDisclaimer`'s required content (exact phone number, exact URL, non-affiliation statement, no-PII-storage statement, phishing warning) plus a regression check that the two pre-existing disclaimer strings (`freeClassesDisclaimer`, `generalDisclaimer`) are untouched.
- `package.json`: added a `"test"` script (`node --import tsx --test src/**/*.test.mjs`) using Node's built-in test runner + the `tsx` loader — both already present in this project (Node 22, `tsx` already a devDependency) — zero new npm packages installed for this.
- `.github/workflows/ci.yml`: added `npm test` as a CI step, positioned *before* `npm run build` (see Notes below for why the ordering matters here specifically).

## Why component-level rendering isn't covered by an automated test
Attempted to render `DisclaimerBanner` and the new page directly via `react-dom/server`'s `renderToStaticMarkup` (already a transitive dependency, no new package needed) outside Next's build pipeline, to actually assert on rendered HTML (e.g. "phone number is not inside an `<a href=\"tel:...\">`"). This failed with a module-interop error — the `@/lib/site` path alias these components import doesn't resolve correctly when the component is loaded outside Next's own bundler (`tsconfig.json`'s `"moduleResolution": "bundler"` is designed for Next/webpack, not standalone `tsx` execution). Fighting that resolution mismatch to stand up component-level rendering tests, in a repo with zero existing test infra, is disproportionate to one static page — matches the explicit instruction not to bolt on heavy new infrastructure here.

This gap is covered by other, non-unit-test means instead of being silently uncovered:
- TypeScript type-checking (`npm run build`'s `Running TypeScript` step) already catches signature-level breakage to `DisclaimerBanner`'s new `children` prop or the page component.
- `.pipeline/changes.md` records that the coder manually verified, against a real running production server: both existing `DisclaimerBanner` call sites (`/`, `/calendar`) still render `freeClassesDisclaimer` unchanged, the new page renders all three required content strings, and — the specific thing that would've been the point of the rendering test — the rendered HTML contains **zero** `href="tel:` or `href="..annualcreditreport.."` occurrences, confirmed by grepping the actual server response.

## Coverage of spec edge cases
- "Do not hyperlink the phone number or annualcreditreport.com": not covered by an automated test (see above) — covered by coder's manual grep-the-real-response verification instead. If a future automated test suite adds real browser/Playwright-driven page tests, this is the first thing worth automating.
- "No forms, no client-side JS on this page": implicitly enforced — the page file has no `"use client"` directive and no form elements; `npm run build`'s route-type output (`○ /free-credit-reports`, static) is itself evidence there's nothing dynamic on the page, since a page needing runtime interactivity/data wouldn't build as fully static.
- "Existing DisclaimerBanner call sites render byte-for-byte identical output": covered directly by this test suite's regression test (`freeClassesDisclaimer`/`generalDisclaimer` content check) plus coder's manual server-response verification of the actual rendered pages.
- "Mobile nav crowding is an accepted limitation, not a defect": nothing to test here by design — noting it's intentionally out of scope, not overlooked.

## Test run result
```
$ npm test
...
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
All 6 pass.

`npm run lint`: pass, no output (re-verified after this change).

## Notes for reviewer (pre-existing issue discovered, not caused by this feature)
`npm run build` (`prisma migrate deploy && next build`) requires a reachable `DATABASE_URL`/`DATABASE_URL_UNPOOLED`. GitHub Actions' `ci.yml` has no such secret configured. Reproduced directly: with those env vars genuinely unset (temporarily moved the local `.env` file aside so `dotenv/config` couldn't repopulate them), `prisma migrate deploy` fails immediately with `"The datasource.url property is required in your Prisma config file when using prisma migrate deploy."` This means CI's build step has almost certainly been failing on every push since task #10's SQLite→Postgres migration, independent of this feature. I positioned the new `npm test` step *before* `npm run build` in the workflow specifically so it still runs and reports clearly even though the later build step is likely red — otherwise my new tests would never execute in CI at all (GitHub Actions stops a job at the first failing step by default). Fixing the underlying CI/DATABASE_URL gap itself (e.g. a Postgres service container in the workflow, or a repo secret) is a real, separate task — flagging for your recommendation on next steps rather than fixing it here, since it's out of scope for "add tests for the credit report page."
