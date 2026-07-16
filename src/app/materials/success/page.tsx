import Link from "next/link";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export default async function MaterialCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return <StatusPage title="Missing checkout session" body="No checkout session was provided." />;
  }

  let purchase = await db.purchase.findUnique({ where: { stripeSessionId: session_id } });

  if (!purchase) {
    return (
      <StatusPage
        title="We couldn't find that order"
        body="If you completed payment, please contact us and we'll get your download to you."
      />
    );
  }

  if (purchase.status !== "paid" && isStripeConfigured()) {
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    if (session.payment_status === "paid") {
      purchase = await db.purchase.update({
        where: { id: purchase.id },
        data: { status: "paid" },
      });
    }
  }

  if (purchase.status !== "paid") {
    return (
      <StatusPage
        title="Payment is still processing"
        body="This can take a minute. Refresh this page shortly, or check the email you provided for your receipt."
      />
    );
  }

  return (
    <StatusPage title="Thank you for your purchase!" body="Your download is ready.">
      <a
        href={`/api/download/${purchase.downloadToken}`}
        className="mt-4 inline-block rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Download your material
      </a>
    </StatusPage>
  );
}

function StatusPage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{body}</p>
      {children}
      <div className="mt-6">
        <Link href="/materials" className="text-sm text-blue-600 hover:underline">
          &larr; Back to resources
        </Link>
      </div>
    </div>
  );
}
