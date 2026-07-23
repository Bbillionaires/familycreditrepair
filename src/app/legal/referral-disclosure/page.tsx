import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Referral & Third-Party Disclosure" };

export default function ReferralDisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Referral &amp; Third-Party Disclosure</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p className="rounded-md bg-amber-50 px-4 py-3 text-amber-900">
          <span className="font-semibold">Note for review: </span>
          The section below assumes One United Enterprise LLC may in some cases
          receive referral compensation from third-party providers. Confirm
          whether this reflects actual practice and adjust before publishing —
          if no referral compensation is ever received, that should be stated
          instead, since either is a factual claim that needs to be accurate.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Independent Third-Party Providers</h2>
          <p className="mt-2">
            From time to time, One United Enterprise LLC (&quot;Company,&quot; &quot;we,&quot;
            &quot;our,&quot; or &quot;us&quot;) may recommend or introduce you to independent
            third-party professionals or businesses, such as mortgage lenders,
            mortgage brokers, housing counselors, credit counseling agencies,
            credit repair organizations, attorneys, accountants, insurance
            professionals, realtors, or other financial professionals.
          </p>
          <p className="mt-2">
            These providers are independent businesses. We do not own,
            supervise, employ, or control them, and any engagement you enter
            into with a third-party provider is a separate agreement between
            you and that provider, governed by its own terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Possible Referral Compensation</h2>
          <p className="mt-2">
            In some cases, One United Enterprise LLC may receive a referral fee,
            marketing fee, or other compensation from a third-party provider in
            connection with a referral or introduction. Receiving such
            compensation does not change the price you pay that provider, and
            does not affect the educational information or referrals we
            provide — we do not accept compensation in exchange for
            recommending a provider we would not otherwise consider
            appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. No Endorsement of Outcome</h2>
          <p className="mt-2">
            A referral or introduction to a third-party provider is not a
            guarantee of that provider&apos;s services, pricing, licensing,
            availability, or results. You are solely responsible for evaluating
            and deciding whether to engage any third-party provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Questions</h2>
          <p className="mt-2">
            If you have questions about a specific referral or introduction,
            including whether compensation was involved, contact us directly.
          </p>
        </section>
      </div>
    </div>
  );
}
