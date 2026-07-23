import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "FTC Earnings/Results Disclaimer" };

export default function FtcDisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">FTC Earnings/Results Disclaimer</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Testimonials Reflect Individual Experiences</h2>
          <p className="mt-2">
            Any testimonials, family stories, success stories, or examples
            shared on CreditCareCourse.com by One United Enterprise LLC
            (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) reflect the personal
            experiences of the individuals depicted. They are not paid actors
            unless otherwise disclosed, but their individual results are not
            typical and are not a guarantee, promise, or prediction of the
            results any other participant will achieve.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. No Guaranteed Credit, Financial, or Mortgage Outcome</h2>
          <p className="mt-2">
            Every individual&apos;s financial circumstances, credit history, and
            goals are different. We do not guarantee any specific credit score
            increase, removal of information from a credit report, mortgage
            approval, loan terms, interest rate, or other financial or
            credit-related outcome for any participant.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Educational Content, Not a Guarantee</h2>
          <p className="mt-2">
            All classes, materials, courses, and 1-on-1 mentoring provided
            through the Site are educational in nature. Results depend on
            numerous factors outside our control, including a participant&apos;s
            individual financial situation, credit history, and the decisions
            of independent third parties such as lenders and credit reporting
            agencies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Compliance With FTC Guidance</h2>
          <p className="mt-2">
            This disclaimer is intended to be consistent with Federal Trade
            Commission guidance concerning the use of endorsements,
            testimonials, and results claims in advertising, which generally
            requires that atypical results be clearly and conspicuously
            disclosed as such.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Related Disclosures</h2>
          <p className="mt-2">
            See also our{" "}
            <a href="/legal/website-disclaimer" className="text-blue-600 hover:underline">
              Website Disclaimer
            </a>{" "}
            and{" "}
            <a href="/legal/credit-education-agreement" className="text-blue-600 hover:underline">
              Credit Education Services Agreement
            </a>{" "}
            for additional important disclosures regarding the educational
            nature of our services.
          </p>
        </section>
      </div>
    </div>
  );
}
