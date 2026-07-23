import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          One United Enterprise LLC (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
          operates CreditCareCourse.com (the &quot;Site&quot;). This Privacy Policy
          explains what information we collect, how we use it, and the choices
          available to you.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Information We Collect</h2>
          <p className="mt-2">We collect information you provide directly, including:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Account information: name, username, email address, and password (stored as a secure one-way hash, never in plain text).</li>
            <li>Class signup and mentoring request information: name, email, phone number (optional), and any message or preferred times you provide.</li>
            <li>Purchase information: name and email address associated with a purchase. Payment card details are collected and processed directly by our third-party payment processor — we do not store your full card number on our servers.</li>
            <li>Communications: information you send us directly, such as through a request form.</li>
          </ul>
          <p className="mt-2">We also automatically collect limited technical information, such as IP address and browser type, for security and site-functionality purposes.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. How We Use Information</h2>
          <p className="mt-2">We use the information we collect to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Provide, maintain, and improve the Site and its educational services;</li>
            <li>Create and manage your account;</li>
            <li>Process purchases and manage your optional membership;</li>
            <li>Respond to class signups, mentoring requests, and other communications;</li>
            <li>Send transactional emails (e.g., password resets, purchase confirmations, request status updates) and, where you&apos;ve consented, other communications — see our{" "}
              <a href="/legal/sms-email-consent" className="text-blue-600 hover:underline">SMS &amp; Email Communication Consent</a>;
            </li>
            <li>Maintain the security and integrity of the Site.</li>
          </ul>
          <p className="mt-2">We do not sell your personal information.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Sharing of Information</h2>
          <p className="mt-2">We share information only with:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Service providers who help us operate the Site (e.g., hosting, database, payment processing, and email delivery providers), bound by their own confidentiality and security obligations;</li>
            <li>Independent third-party professionals you specifically ask to be referred to or connected with (see our{" "}
              <a href="/legal/referral-disclosure" className="text-blue-600 hover:underline">Referral &amp; Third-Party Disclosure</a>);
            </li>
            <li>Law enforcement or other parties when required by law, or to protect the rights, property, or safety of the Company or others.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Cookies and Similar Technologies</h2>
          <p className="mt-2">
            The Site uses essential cookies (for example, to keep you signed in)
            necessary for core functionality. We do not currently use
            third-party advertising or cross-site tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Data Retention</h2>
          <p className="mt-2">
            We retain account and transaction information for as long as your
            account is active and as needed to comply with legal, tax, and
            accounting obligations. You may request deletion of your account as
            described below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Your Rights and Choices</h2>
          <p className="mt-2">
            Depending on your state of residence, you may have rights under
            applicable privacy law (including the Florida Digital Bill of
            Rights, where applicable) to access, correct, or request deletion of
            your personal information. To make a request, contact us using the
            information below. We will respond within the time required by
            applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Children&apos;s Privacy</h2>
          <p className="mt-2">
            The Site is not directed to children under 13, and we do not
            knowingly collect personal information from children under 13
            (consistent with the Children&apos;s Online Privacy Protection Act).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Security</h2>
          <p className="mt-2">
            We use commercially reasonable technical and administrative
            safeguards to protect your information. No method of transmission
            or storage is completely secure, and we cannot guarantee absolute
            security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">9. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. Material
            changes will be reflected by an updated effective date on this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">10. Contact Us</h2>
          <p className="mt-2">
            Questions about this Privacy Policy or requests regarding your
            personal information can be directed to One United Enterprise LLC
            using the contact details provided at signup or on your account
            correspondence.
          </p>
        </section>
      </div>
    </div>
  );
}
