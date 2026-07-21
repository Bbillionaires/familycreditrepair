import { test } from "node:test";
import assert from "node:assert/strict";
import { site } from "./site.ts";

test("creditReportDisclaimer mentions the official phone number", () => {
  assert.ok(site.creditReportDisclaimer.includes("1-877-322-8228"));
});

test("creditReportDisclaimer mentions the official website", () => {
  assert.ok(site.creditReportDisclaimer.includes("annualcreditreport.com"));
});

test("creditReportDisclaimer states non-affiliation with the credit bureaus", () => {
  assert.match(site.creditReportDisclaimer, /not affiliated with Equifax/i);
});

test("creditReportDisclaimer states no PII/report is stored on the user's behalf", () => {
  assert.match(site.creditReportDisclaimer, /never request, receive, or store/i);
});

test("creditReportDisclaimer warns about phishing / imposter sites", () => {
  assert.match(site.creditReportDisclaimer, /be wary of any other site or caller/i);
});

test("existing freeClassesDisclaimer and generalDisclaimer are untouched", () => {
  assert.ok(site.freeClassesDisclaimer.includes("100% free to attend"));
  assert.ok(site.generalDisclaimer.includes("educational purposes only"));
});
