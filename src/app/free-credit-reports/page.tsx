import Link from "next/link";
import DisclaimerBanner from "@/components/disclaimer-banner";
import { site } from "@/lib/site";

export const metadata = { title: "Free Credit Reports" };

export default function FreeCreditReportsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Get your free credit reports</h1>
      <p className="mt-2 text-slate-600">
        Every U.S. consumer is entitled by federal law to one free copy of
        their credit report from each of the three nationwide bureaus
        (Equifax, Experian, and TransUnion) every 12 months, through the
        official AnnualCreditReport.com program.
      </p>
      <div className="mt-4">
        <DisclaimerBanner>{site.creditReportDisclaimer}</DisclaimerBanner>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900">How to order</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">1-877-322-8228</p>
            <p className="mt-1 text-sm text-slate-500">
              A 3-minute call. Reports for all three bureaus arrive by mail
              within about 15 days.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">annualcreditreport.com</p>
            <p className="mt-1 text-sm text-slate-500">
              Request and often view your reports online the same day.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Mail-in request form</p>
            <p className="mt-1 text-sm text-slate-500">
              Print and mail the official request form if you&apos;d rather
              not call or go online; also takes about 15 days by mail.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Questions about a class or material?{" "}
        <Link href="/calendar" className="text-blue-600 hover:text-blue-700">
          Check our class calendar
        </Link>{" "}
        or{" "}
        <Link href="/materials" className="text-blue-600 hover:text-blue-700">
          browse our resources
        </Link>
        .
      </p>
    </div>
  );
}
