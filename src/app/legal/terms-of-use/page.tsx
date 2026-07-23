import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Website Terms of Use" };

export default function TermsOfUsePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Website Terms of Use</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          These Terms of Use (&quot;Terms&quot;) govern your access to and use of the
          CreditCareCourse.com website (the &quot;Site&quot;), operated by One United
          Enterprise LLC, a Florida limited liability company (&quot;Company,&quot;
          &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or using the Site, you agree to
          be bound by these Terms. If you do not agree, do not use the Site.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Description of the Site</h2>
          <p className="mt-2">
            The Site provides educational and informational content relating to
            consumer credit, financial literacy, budgeting, and homeownership
            preparation, including free and paid materials, live and recorded
            classes, self-paced courses, an optional paid membership, and
            optional 1-on-1 mentoring session requests. The Site is educational
            in nature and is not a substitute for professional legal, tax,
            financial, or credit repair services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Eligibility</h2>
          <p className="mt-2">
            You must be at least 18 years old to create an account, make a
            purchase, or submit a request through the Site. By using the Site,
            you represent that you meet this requirement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Accounts</h2>
          <p className="mt-2">
            Some features of the Site require creating an account with a
            username, email address, and password. You are responsible for
            maintaining the confidentiality of your login credentials and for
            all activity that occurs under your account. Notify us promptly of
            any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Acceptable Use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Use the Site for any unlawful purpose;</li>
            <li>Attempt to gain unauthorized access to any part of the Site, other accounts, or systems;</li>
            <li>Interfere with or disrupt the Site&apos;s operation, including through automated scraping or abuse of any request forms;</li>
            <li>Copy, resell, or redistribute paid materials or course content without authorization;</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Purchases and Membership</h2>
          <p className="mt-2">
            Paid materials, courses, and the optional membership are processed
            through a third-party payment processor. See our{" "}
            <a href="/legal/payment-refund-policy" className="text-blue-600 hover:underline">
              Payment, Refund &amp; Cancellation Policy
            </a>{" "}
            for details on billing, cancellation, and refunds.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Intellectual Property</h2>
          <p className="mt-2">
            All content on the Site — including text, graphics, videos, course
            materials, and downloadable guides — is the property of One United
            Enterprise LLC or its licensors and is protected by intellectual
            property laws. You may not copy, distribute, sell, modify, or
            reproduce Site content without prior written permission, except for
            personal, non-commercial use of materials you have properly
            purchased or been granted access to.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Testimonials and Third-Party Links</h2>
          <p className="mt-2">
            Testimonials on the Site reflect individual experiences and are not
            typical or guaranteed — see our{" "}
            <a href="/legal/ftc-disclaimer" className="text-blue-600 hover:underline">
              FTC Earnings/Results Disclaimer
            </a>
            . The Site may link to or reference independent third-party
            businesses; see our{" "}
            <a href="/legal/referral-disclosure" className="text-blue-600 hover:underline">
              Referral &amp; Third-Party Disclosure
            </a>
            . We do not control and are not responsible for third-party sites or
            services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Disclaimers</h2>
          <p className="mt-2">
            The Site and its content are provided &quot;as is&quot; without warranties of
            any kind, express or implied. We do not guarantee that the Site will
            be uninterrupted, error-free, or secure. See our{" "}
            <a href="/legal/website-disclaimer" className="text-blue-600 hover:underline">
              Website Disclaimer
            </a>{" "}
            for additional important disclosures.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">9. Limitation of Liability</h2>
          <p className="mt-2">
            To the fullest extent permitted by Florida law, One United
            Enterprise LLC and its owners, members, employees, contractors, and
            affiliates shall not be liable for any indirect, incidental,
            consequential, special, exemplary, or punitive damages arising out
            of or relating to your use of the Site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">10. Termination</h2>
          <p className="mt-2">
            We may suspend or terminate your access to the Site at any time,
            with or without notice, for conduct that violates these Terms or is
            otherwise harmful to other users or the Site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">11. Changes to These Terms</h2>
          <p className="mt-2">
            We may update these Terms from time to time. Continued use of the
            Site after changes are posted constitutes acceptance of the revised
            Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">12. Governing Law</h2>
          <p className="mt-2">
            These Terms are governed by the laws of the State of Florida.
            Any legal action arising under these Terms shall be brought in a
            court of competent jurisdiction located within the State of
            Florida, unless otherwise required by applicable law.
          </p>
        </section>
      </div>
    </div>
  );
}
