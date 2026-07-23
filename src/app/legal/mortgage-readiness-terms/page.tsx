import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Mortgage Readiness Program Terms" };

export default function MortgageReadinessTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Mortgage Readiness Program Terms</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          These terms apply specifically to any &quot;Mortgage Readiness&quot; or
          homebuyer-preparation content, class, or program offered by One
          United Enterprise LLC (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) through
          CreditCareCourse.com, in addition to our general{" "}
          <a href="/legal/credit-education-agreement" className="text-blue-600 hover:underline">
            Credit Education Services Agreement
          </a>
          , which continues to apply.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Educational Purpose Only</h2>
          <p className="mt-2">
            The Mortgage Readiness program is educational in nature. It is
            designed to help participants understand the general concepts
            involved in preparing to buy a home, including credit, budgeting,
            down payment assistance concepts, and the mortgage process at a
            high level.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. We Are Not a Lender or Broker</h2>
          <p className="mt-2">
            One United Enterprise LLC is not a mortgage lender, mortgage
            broker, or loan originator, and does not take loan applications,
            quote loan terms or interest rates, or make lending decisions.
            Participation in the Mortgage Readiness program does not
            constitute an application for, or a commitment to provide, any
            loan or financing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. No Guarantee of Mortgage Approval</h2>
          <p className="mt-2">
            We do not guarantee that any participant will qualify for a
            mortgage, be approved for financing, receive down payment
            assistance, or achieve any specific interest rate or loan terms.
            Mortgage approval depends on a lender&apos;s independent underwriting
            criteria, which we do not control.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Referrals to Lenders and Housing Professionals</h2>
          <p className="mt-2">
            Where appropriate, we may refer participants to independent
            mortgage lenders, brokers, housing counselors, or realtors. See our{" "}
            <a href="/legal/referral-disclosure" className="text-blue-600 hover:underline">
              Referral &amp; Third-Party Disclosure
            </a>{" "}
            for details. Any loan application or engagement with such a
            provider is governed entirely by that provider&apos;s own terms and is
            separate from this Site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Down Payment Assistance References</h2>
          <p className="mt-2">
            Any reference to down payment assistance programs is educational
            and illustrative only. Availability, eligibility, and amounts for
            such programs are determined entirely by the third-party
            organizations or government agencies that administer them, not by
            One United Enterprise LLC.
          </p>
        </section>
      </div>
    </div>
  );
}
