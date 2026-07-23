import DraftLegalBanner from "@/components/draft-legal-banner";

export const metadata = { title: "Payment, Refund & Cancellation Policy" };

export default function PaymentRefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Payment, Refund &amp; Cancellation Policy</h1>
      <div className="mt-4">
        <DraftLegalBanner />
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          This policy covers payments, refunds, and cancellations for services
          offered by One United Enterprise LLC (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot; or
          &quot;us&quot;) through CreditCareCourse.com.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Free Services</h2>
          <p className="mt-2">
            All live classes and workshops are 100% free to attend. Materials
            marked &quot;Free&quot; never require payment. Attending a class is never
            required to access free materials, and purchasing materials is
            never required to attend a class.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Paid Materials and Courses</h2>
          <p className="mt-2">
            Some downloadable materials and courses are offered for a one-time
            fee, processed securely through our third-party payment processor.
            Because these are digital products delivered immediately upon
            purchase (via instant download or immediate course access), all
            sales are final and non-refundable once the material has been
            downloaded or the course has been accessed, except where required
            by law or where we determine, in our discretion, that a refund is
            appropriate (for example, a technical error preventing access).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Optional Membership</h2>
          <p className="mt-2">
            The optional membership is a recurring monthly subscription billed
            to the payment method on file. The first charge occurs at signup,
            and the membership renews automatically each month until canceled.
            You may cancel at any time from your account&apos;s membership
            management page — cancellation takes effect at the end of the
            current billing period, and no partial-month refunds are provided
            for the remainder of a billing cycle already paid for. Membership
            is entirely optional and never required to access free classes or
            free materials.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Failed or Declined Payments</h2>
          <p className="mt-2">
            If a membership renewal payment fails, your membership status may
            be marked past due. We do not restrict access to free content based
            on membership status. If payment issues are not resolved, your
            membership subscription may ultimately be canceled by our payment
            processor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Class Cancellations</h2>
          <p className="mt-2">
            We may occasionally need to reschedule or cancel a class. Because
            classes are free, no monetary refund applies; we will make
            reasonable efforts to notify registered attendees of any change.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. 1-on-1 Mentoring Sessions</h2>
          <p className="mt-2">
            Submitting a 1-on-1 mentoring request does not create a financial
            obligation and does not charge any payment method. Any session rate
            shown is informational. Payment terms, scheduling, and cancellation
            terms for an approved 1-on-1 session are arranged directly between
            you and the mentor or Company after approval, and are not processed
            through this Site&apos;s checkout system.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Chargebacks</h2>
          <p className="mt-2">
            If you believe you were charged in error, please contact us before
            initiating a chargeback with your bank or card issuer so we can
            attempt to resolve the issue directly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Contact</h2>
          <p className="mt-2">
            Questions about a charge, refund, or cancellation can be directed to
            One United Enterprise LLC using the contact details provided at
            signup or on your account correspondence.
          </p>
        </section>
      </div>
    </div>
  );
}
