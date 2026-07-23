import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import PrintButton from "./print-button";

export const dynamic = "force-dynamic";

function formatCertificateDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function CertificatePage() {
  const { userId } = await requireUser();
  const [user, certificate] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.certificate.findUnique({ where: { userId } }),
  ]);
  if (!user) return null;

  if (!certificate) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Certificate</h1>
        <p className="mt-2 text-slate-600">
          You haven&apos;t earned your certificate yet. Complete every lesson checklist and pass
          the certification quiz to unlock it.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link href="/courses" className="text-blue-600 hover:underline">
            Browse courses
          </Link>
          <Link href="/account/quiz" className="text-blue-600 hover:underline">
            Take the quiz
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 print:py-0 sm:px-6">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>
      <div className="rounded-2xl border-4 border-blue-700 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          Certificate of Completion
        </p>
        <p className="mt-8 text-lg text-slate-600">This certifies that</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{user.username}</p>
        <p className="mt-6 text-lg text-slate-600">
          has completed the {site.name} credit education program.
        </p>
        <p className="mt-8 text-sm text-slate-500">
          Issued {formatCertificateDate(certificate.issuedAt)}
        </p>
      </div>
    </div>
  );
}
