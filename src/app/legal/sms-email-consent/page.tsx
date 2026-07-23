import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "SMS & Email Communication Consent" };

export default function SmsEmailConsentPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">SMS &amp; Email Communication Consent</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          This policy describes how One United Enterprise LLC (&quot;Company,&quot;
          &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) communicates with you by email and, where
          applicable, text message (SMS), and the consent that governs those
          communications.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Consent to Communicate</h2>
          <p className="mt-2">
            By providing your email address or phone number through the Site —
            including at signup, on a class signup form, or on a mentoring
            request form — you consent to receive communications from us at
            that email address or phone number, including:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Transactional messages (e.g., account confirmations, password resets, purchase receipts, class reminders, mentoring request updates);</li>
            <li>Service-related updates; and</li>
            <li>Where you have separately opted in, promotional or marketing messages.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Text Message (SMS) Consent</h2>
          <p className="mt-2">
            If you provide a mobile phone number and opt in to SMS
            communications, you consent to receive text messages from or on
            behalf of One United Enterprise LLC, which may be sent using an
            automatic telephone dialing system, consistent with the Telephone
            Consumer Protection Act (TCPA). Consent to receive SMS messages is
            not a condition of any purchase. Message and data rates may apply.
            Message frequency varies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Email Consent and CAN-SPAM Compliance</h2>
          <p className="mt-2">
            Marketing emails we send will identify One United Enterprise LLC as
            the sender, use accurate subject lines, and include a working
            unsubscribe mechanism, consistent with the CAN-SPAM Act.
            Transactional and account-related emails (such as password resets
            and purchase confirmations) are necessary to provide the Site&apos;s
            services and are sent regardless of marketing preferences.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. How to Opt Out</h2>
          <p className="mt-2">
            You may opt out of marketing emails at any time by using the
            unsubscribe link included in those emails. For SMS, you may opt out
            by replying STOP to any text message, or by contacting us directly.
            We will honor opt-out requests within the time required by
            applicable law. Opting out of marketing communications does not
            opt you out of transactional or account-related messages necessary
            to operate your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Updating Your Information</h2>
          <p className="mt-2">
            You are responsible for keeping your contact information current.
            You can update your email address from your account settings.
          </p>
        </section>
      </div>
    </div>
  );
}
