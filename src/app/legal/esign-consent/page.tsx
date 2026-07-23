import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Electronic Signature & E-SIGN Consent" };

export default function EsignConsentPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Electronic Signature &amp; E-SIGN Consent</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          This policy explains how One United Enterprise LLC (&quot;Company,&quot;
          &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) uses electronic records and electronic
          signatures (such as checkbox agreements on this Site), and the
          consent required for you to do business with us electronically,
          consistent with the federal Electronic Signatures in Global and
          National Commerce Act (E-SIGN Act) and the Uniform Electronic
          Transactions Act (UETA) as adopted in Florida.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Consent to Electronic Records and Signatures</h2>
          <p className="mt-2">
            By checking a consent box, clicking &quot;I agree&quot; or a similar button,
            or otherwise completing a form on the Site that indicates
            agreement, you are signing an agreement electronically and agreeing
            that your electronic signature is the legal equivalent of your
            manual, handwritten signature. You agree that agreements, notices,
            disclosures, and other records we provide to you electronically
            satisfy any legal requirement that such communications be in
            writing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Hardware and Software Requirements</h2>
          <p className="mt-2">
            To access and retain electronic records, you will need a device
            with internet access, a current web browser, and the ability to
            receive and store or print email and PDF documents. If our
            requirements change in a way that creates a material risk you would
            not be able to access records, we will notify you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Requesting Paper Copies</h2>
          <p className="mt-2">
            You may request a paper copy of any electronic record by contacting
            us. We may charge a reasonable fee for providing paper copies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Withdrawing Consent</h2>
          <p className="mt-2">
            You may withdraw your consent to conduct business electronically at
            any time by contacting us, though doing so may limit or prevent
            your ability to use certain features of the Site that depend on
            electronic agreements (such as submitting a class signup or
            mentoring request online).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Updating Your Contact Information</h2>
          <p className="mt-2">
            You must keep your email address current so that we can send you
            electronic records and notices. You can update your email address
            from your account settings.
          </p>
        </section>
      </div>
    </div>
  );
}
