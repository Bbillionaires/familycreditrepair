import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Website Disclaimer" };

export default function WebsiteDisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Website Disclaimer</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Educational Site, Not a Credit Repair Organization</h2>
          <p className="mt-2">
            CreditCareCourse.com is operated by One United Enterprise LLC
            (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) and provides educational and
            informational content relating to consumer credit, budgeting,
            debt, and homeownership preparation. Unless expressly stated in a
            separate written agreement, we are not acting as a credit repair
            organization, and nothing on this Site should be interpreted as an
            offer to perform credit repair services on your behalf, including
            disputing, challenging, or removing information from your credit
            report with a credit reporting agency.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Not Legal, Tax, Investment, or Lending Advice</h2>
          <p className="mt-2">
            Content on this Site is general educational information only and
            is not a substitute for personalized legal, tax, investment,
            lending, or financial planning advice from a licensed professional.
            You should consult qualified professionals regarding your specific
            situation before making financial decisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. No Guaranteed Results</h2>
          <p className="mt-2">
            We make no guarantee, representation, or warranty regarding credit
            score improvement, mortgage qualification, loan approval, interest
            rates, credit report changes, debt reduction, or any other specific
            financial outcome. See our{" "}
            <a href="/legal/ftc-disclaimer" className="text-blue-600 hover:underline">
              FTC Earnings/Results Disclaimer
            </a>{" "}
            for more on testimonials and results claims.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Not Affiliated With Credit Bureaus or Government Programs</h2>
          <p className="mt-2">
            We are not affiliated with Equifax, Experian, TransUnion, or
            AnnualCreditReport.com. The only official source for your free
            annual credit reports is annualcreditreport.com or
            1-877-322-8228 — be wary of any other site or caller offering
            &quot;free credit reports&quot; that asks for payment or excessive personal
            information upfront. References to down payment assistance or
            mortgage programs are educational and illustrative only; see our{" "}
            <a href="/legal/mortgage-readiness-terms" className="text-blue-600 hover:underline">
              Mortgage Readiness Program Terms
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Third-Party Information</h2>
          <p className="mt-2">
            This Site may reference or link to independent third-party
            businesses or resources. We do not control and are not responsible
            for the accuracy, completeness, or availability of third-party
            information. See our{" "}
            <a href="/legal/referral-disclosure" className="text-blue-600 hover:underline">
              Referral &amp; Third-Party Disclosure
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. &quot;As Is&quot; Basis</h2>
          <p className="mt-2">
            This Site and its content are provided on an &quot;as is&quot; and &quot;as
            available&quot; basis, without warranties of any kind, to the fullest
            extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Related Documents</h2>
          <p className="mt-2">
            This disclaimer works alongside our other policies, including our{" "}
            <a href="/legal/credit-education-agreement" className="text-blue-600 hover:underline">
              Credit Education Services Agreement
            </a>
            ,{" "}
            <a href="/legal/terms-of-use" className="text-blue-600 hover:underline">
              Website Terms of Use
            </a>
            , and{" "}
            <a href="/legal/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
