"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getResend, isResendConfigured, EMAIL_FROM } from "@/lib/email";

async function getSiteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

const MentorRequestSchema = z.object({
  mentorId: z.string().trim().min(1, "Please choose a mentor"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  preferredTimes: z.string().trim().min(1, "Let us know what times work for you"),
  message: z.string().trim().optional(),
  agreedToTerms: z.literal(true, { message: "You must agree to continue" }),
});

export type MentorRequestFormState = { error?: string; success?: boolean } | undefined;

export async function createMentorRequest(
  _prevState: MentorRequestFormState,
  formData: FormData
): Promise<MentorRequestFormState> {
  const parsed = MentorRequestSchema.safeParse({
    mentorId: formData.get("mentorId"),
    name: formData.get("name"),
    email: formData.get("email"),
    preferredTimes: formData.get("preferredTimes"),
    message: formData.get("message") || undefined,
    agreedToTerms: formData.get("agreedToTerms") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { mentorId, name, email, preferredTimes, message } = parsed.data;

  const mentor = await db.mentor.findUnique({ where: { id: mentorId } });
  if (!mentor || !mentor.active) {
    return { error: "This mentor is no longer available. Please choose another." };
  }

  await db.mentorRequest.create({
    data: {
      mentorId: mentor.id,
      name,
      email,
      preferredTimes,
      message,
      agreedToTerms: true,
      status: "pending",
    },
  });

  const origin = await getSiteOrigin();
  const body = `New request for ${mentor.name}:\n\nFrom: ${name} (${email})\nPreferred times: ${preferredTimes}\nMessage: ${message || "(none)"}\n\nReview and approve/decline at ${origin}/admin/mentoring`;

  if (isResendConfigured()) {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      await getResend().emails.send({
        from: EMAIL_FROM,
        to: adminEmail,
        subject: "New 1-on-1 mentoring request",
        text: body,
      });
    } else {
      console.error("ADMIN_NOTIFICATION_EMAIL not set — cannot send mentoring request notification");
    }

    if (mentor.notifyMentorOnRequest) {
      await getResend().emails.send({
        from: EMAIL_FROM,
        to: mentor.email,
        subject: "New 1-on-1 mentoring request",
        text: body,
      });
    }
  } else {
    console.error("RESEND_API_KEY not set — cannot send mentoring request notification for", email);
  }

  revalidatePath("/admin/mentoring");
  return { success: true };
}
