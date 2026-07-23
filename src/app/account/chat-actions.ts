"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getOpenAI, isOpenAIConfigured, CHAT_MODEL, CHAT_MAX_TOKENS } from "@/lib/openai";
import { getChatSettings } from "@/lib/chat-settings";

async function getSiteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

const RATE_LIMIT_MS = 3000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SendChatMessageResult =
  | { error: string }
  | {
      reply: string;
      questionsUsedToday: number;
      freeQuestionsRemaining: number;
      creditBalance: number;
    };

function buildSystemPrompt(purchasedTitles: string[]): string {
  // Soft steering mechanism only, NOT a security boundary — a sufficiently
  // determined user can still get the model to discuss other things. The
  // goal here is discouraging casual off-topic/general-chatbot use of a
  // paid seat, not guaranteeing topic enforcement.
  const base = `You are the AI education assistant for CreditCareCourse.com. You only help with consumer credit, credit scores, budgeting, debt management, and mortgage/homeownership readiness education. If asked about anything unrelated to those topics, politely decline and redirect the conversation back to credit and financial education.

You are not a licensed financial, legal, tax, or credit advisor. Never guarantee any specific credit score change or financial outcome. Remind the user to consult a qualified professional for advice specific to their situation when appropriate.`;

  if (purchasedTitles.length === 0) return base;

  return `${base}

This member has access to the following materials/courses: ${purchasedTitles.join(", ")}. Use these as helpful context for examples when relevant, but still answer any in-scope question regardless of what's on this list.`;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<SendChatMessageResult> {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Account not found." };

  if (!user.isComped && user.membershipStatus !== "active") {
    return { error: "An active membership is required to use the chat assistant." };
  }

  if (!isOpenAIConfigured()) {
    return { error: "The chat assistant isn't set up yet. Please check back later." };
  }

  const lastUsage = await db.chatUsage.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (lastUsage && Date.now() - lastUsage.createdAt.getTime() < RATE_LIMIT_MS) {
    return { error: "You're sending messages too quickly — please wait a moment and try again." };
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const questionsUsedToday = await db.chatUsage.count({
    where: { userId, createdAt: { gte: startOfToday } },
  });

  const settings = await getChatSettings();

  if (questionsUsedToday >= settings.hardDailyCap) {
    return {
      error: "You've reached today's question limit, even with purchased credits. Please try again tomorrow.",
    };
  }

  const isFree = questionsUsedToday < settings.dailyFreeQuestions;

  if (!isFree && user.chatCreditBalance <= 0) {
    return { error: "You've used today's free questions. Purchase a question pack to keep chatting." };
  }

  for (const m of messages) {
    if (m.content.length > MAX_MESSAGE_LENGTH) {
      return { error: "Message is too long." };
    }
  }
  const truncatedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const [materialPurchases, coursePurchases] = await Promise.all([
    db.purchase.findMany({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "paid",
        materialId: { not: null },
      },
      include: { material: true },
    }),
    db.purchase.findMany({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "paid",
        courseId: { not: null },
      },
      include: { course: true },
    }),
  ]);

  const purchasedTitles = [
    ...materialPurchases.filter((p) => p.material !== null).map((p) => p.material!.title),
    ...coursePurchases.filter((p) => p.course !== null).map((p) => p.course!.title),
  ];

  const systemPrompt = buildSystemPrompt(purchasedTitles);

  let reply: string | null | undefined;
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      messages: [{ role: "system", content: systemPrompt }, ...truncatedMessages],
    });
    reply = completion.choices[0]?.message?.content;
  } catch {
    return { error: "The assistant couldn't respond right now. Please try again." };
  }

  if (!reply) {
    return { error: "The assistant couldn't respond right now. Please try again." };
  }

  await db.chatUsage.create({ data: { userId } });
  if (!isFree) {
    await db.user.update({ where: { id: userId }, data: { chatCreditBalance: { decrement: 1 } } });
  }

  return {
    reply,
    questionsUsedToday: questionsUsedToday + 1,
    freeQuestionsRemaining: Math.max(0, settings.dailyFreeQuestions - (questionsUsedToday + 1)),
    creditBalance: isFree ? user.chatCreditBalance : user.chatCreditBalance - 1,
  };
}

export type PackCheckoutState = { error?: string } | undefined;

export async function startQuestionPackCheckout(
  _prevState: PackCheckoutState,
  _formData: FormData
): Promise<PackCheckoutState> {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Account not found." };

  if (!user.isComped && user.membershipStatus !== "active") {
    return { error: "An active membership is required to purchase question packs." };
  }

  if (!isStripeConfigured()) {
    return { error: "Online payments aren't set up yet. Please contact us directly." };
  }

  const settings = await getChatSettings();
  const origin = await getSiteOrigin();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: settings.packPriceCents,
          product_data: { name: `${settings.packQuestionCount} AI chat questions` },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/account/chat?pack=success`,
    cancel_url: `${origin}/account/chat`,
  });

  if (!session.url) return { error: "Could not start checkout. Please try again." };

  await db.chatPackPurchase.create({
    data: {
      userId: user.id,
      questionsGranted: settings.packQuestionCount,
      amountCents: settings.packPriceCents,
      stripeSessionId: session.id,
      status: "pending",
    },
  });

  redirect(session.url);
}
