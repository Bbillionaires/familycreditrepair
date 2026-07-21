# Changes: Free annual credit report info page

## Files changed
- `src/lib/site.ts`: added `creditReportDisclaimer` string (exact wording from spec, unparaphrased).
- `src/components/disclaimer-banner.tsx`: added optional `children` prop, defaulting to `site.freeClassesDisclaimer` when omitted — existing call sites unchanged and unaffected.
- `src/app/free-credit-reports/page.tsx` (new): static informational page — official phone/web/mail channels, non-affiliation + phishing-warning disclaimer, cross-links to `/calendar` and `/materials`. No forms, no client JS, no database access.
- `src/components/site-header.tsx`: added `{ href: "/free-credit-reports", label: "Free Credit Reports" }` to the nav `links` array (last entry).
- `src/components/site-footer.tsx`: added matching `<li>` to the footer's "Explore" list (last entry).

## Notes / deviations from spec
None.

## Build/lint status
- `npm run lint`: pass, no output.
- `npm run build`: pass (verified against a real Postgres instance, matching prior verification approach). `/free-credit-reports` correctly builds as a static (`○`) route, since it's pure content with no dynamic data — no `dynamic` export was needed or added.
- Manually verified via a production server (`next start`): `/` and `/calendar` still render `site.freeClassesDisclaimer` unchanged (confirming the `DisclaimerBanner` default-children fallback works); `/free-credit-reports` returns 200 and contains the phone number, annualcreditreport.com, and the non-affiliation disclaimer text; confirmed neither the phone number nor annualcreditreport.com is rendered as a clickable `<a>` link (grepped the rendered HTML for `href="tel:` and `href="..annualcreditreport..` — zero matches, as required).
