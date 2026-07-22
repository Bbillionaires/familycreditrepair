"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

async function getSiteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export type MembershipActionState = { error?: string } | undefined;

export async function startMembershipCheckout(
  _prevState: MembershipActionState,
  _formData: FormData
): Promise<MembershipActionState> {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Account not found." };

  if (!isStripeConfigured()) {
    return {
      error: "Online payments aren't set up yet. Please contact us directly.",
    };
  }

  if (user.isComped || user.membershipStatus === "active") {
    return { error: "You're already a member — thank you!" };
  }

  const origin = await getSiteOrigin();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 999,
          recurring: { interval: "month" },
          product_data: { name: "CreditCareCourse.com Membership" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/account?membership=success`,
    cancel_url: `${origin}/account`,
  });

  if (!session.url) return { error: "Could not start checkout. Please try again." };
  redirect(session.url);
}

export async function openBillingPortal(
  _prevState: MembershipActionState,
  _formData: FormData
): Promise<MembershipActionState> {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Account not found." };

  if (!user.stripeCustomerId) {
    return { error: "No billing account found yet." };
  }

  const origin = await getSiteOrigin();
  const stripe = getStripe();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/account`,
  });

  if (!portalSession.url) return { error: "Could not open the billing portal. Please try again." };
  redirect(portalSession.url);
}
