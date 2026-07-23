import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === "subscription") {
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (userId && customerId && subscriptionId) {
        await db.user.updateMany({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            membershipStatus: "active",
          },
        });
      }
    } else if (session.payment_status === "paid") {
      const chatPack = await db.chatPackPurchase.findUnique({ where: { stripeSessionId: session.id } });

      if (chatPack) {
        // Idempotency: a replayed/duplicate webhook delivery for the same
        // session finds status already "paid" and is a deliberate no-op —
        // this is the only place in the app that increments (rather than
        // sets) a balance, so it needs an explicit dedup guard, unlike the
        // membership branch above where every write is an idempotent set.
        if (chatPack.status !== "paid") {
          // First (and, per this app's conventions, only) use of a
          // transaction here — this is a genuine multi-table atomic update
          // (flip the purchase's status AND credit the user's balance
          // together); every other write in this app is single-table.
          await db.$transaction([
            db.chatPackPurchase.update({ where: { id: chatPack.id }, data: { status: "paid" } }),
            db.user.update({
              where: { id: chatPack.userId },
              data: { chatCreditBalance: { increment: chatPack.questionsGranted } },
            }),
          ]);
        }
      } else {
        await db.purchase.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: "paid" },
        });
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const status =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : subscription.status === "active"
          ? "active"
          : subscription.status === "canceled"
            ? "canceled"
            : "past_due";

    await db.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { membershipStatus: status },
    });
  }

  return NextResponse.json({ received: true });
}
