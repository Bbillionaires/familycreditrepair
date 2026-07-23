import Link from "next/link";

export const metadata = { title: "Legal" };

const documents = [
  {
    href: "/legal/credit-education-agreement",
    title: "Credit Education Services Agreement",
    reviewed: true,
  },
  { href: "/legal/terms-of-use", title: "Website Terms of Use", reviewed: false },
  { href: "/legal/privacy-policy", title: "Privacy Policy", reviewed: false },
  {
    href: "/legal/sms-email-consent",
    title: "SMS & Email Communication Consent",
    reviewed: false,
  },
  {
    href: "/legal/esign-consent",
    title: "Electronic Signature & E-SIGN Consent",
    reviewed: false,
  },
  {
    href: "/legal/referral-disclosure",
    title: "Referral & Third-Party Disclosure",
    reviewed: false,
  },
  {
    href: "/legal/payment-refund-policy",
    title: "Payment, Refund & Cancellation Policy",
    reviewed: false,
  },
  {
    href: "/legal/mortgage-readiness-terms",
    title: "Mortgage Readiness Program Terms",
    reviewed: false,
  },
  { href: "/legal/ftc-disclaimer", title: "FTC Earnings/Results Disclaimer", reviewed: false },
  { href: "/legal/website-disclaimer", title: "Website Disclaimer", reviewed: false },
];

export default function LegalIndexPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Legal</h1>
      <p className="mt-2 text-slate-600">
        Policies and agreements covering CreditCareCourse.com and its services.
      </p>

      <ul className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {documents.map((doc) => (
          <li key={doc.href}>
            <Link
              href={doc.href}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{doc.title}</span>
              {doc.reviewed ? (
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  Attorney-reviewed
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                  Draft
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
