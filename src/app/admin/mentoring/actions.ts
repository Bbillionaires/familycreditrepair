"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { getResend, isResendConfigured, EMAIL_FROM } from "@/lib/email";

async function sendOutcomeEmail(
  request: { email: string; mentor: { name: string } | null },
  status: "approved" | "declined"
) {
  if (!isResendConfigured()) {
    console.error("RESEND_API_KEY not set — cannot send mentoring outcome email for", request.email);
    return;
  }

  if (status === "approved") {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: request.email,
      subject: "Your 1-on-1 session request was approved",
      text: `Good news — your request to meet with ${request.mentor?.name ?? "a mentor"} was approved. They'll be in touch directly to arrange a time.`,
    });
  } else {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: request.email,
      subject: "Update on your 1-on-1 session request",
      text: "Thanks for your interest — we're not able to move forward with this request right now.",
    });
  }
}

export async function approveMentorRequest(requestId: string) {
  await requireAdmin();

  const request = await db.mentorRequest.findUnique({
    where: { id: requestId },
    include: { mentor: true },
  });
  if (!request) return;
  if (request.status !== "pending") return;

  await db.mentorRequest.update({ where: { id: requestId }, data: { status: "approved" } });
  await sendOutcomeEmail(request, "approved");

  revalidatePath("/admin/mentoring");
}

export async function declineMentorRequest(requestId: string) {
  await requireAdmin();

  const request = await db.mentorRequest.findUnique({
    where: { id: requestId },
    include: { mentor: true },
  });
  if (!request) return;
  if (request.status !== "pending") return;

  await db.mentorRequest.update({ where: { id: requestId }, data: { status: "declined" } });
  await sendOutcomeEmail(request, "declined");

  revalidatePath("/admin/mentoring");
}
