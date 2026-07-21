"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const EmailSchema = z.string().trim().email("Enter a valid email address");

async function getSiteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export type CourseActionState = { error?: string } | undefined;

export async function requestFreeCourseAccess(
  courseId: string,
  _prevState: CourseActionState,
  formData: FormData
): Promise<CourseActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const emailResult = EmailSchema.safeParse(formData.get("email"));

  if (!name) return { error: "Name is required" };
  if (!emailResult.success) return { error: emailResult.error.issues[0]?.message };

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) return { error: "Course not found" };
  if (course.priceCents !== 0) return { error: "This course is not free" };

  const downloadToken = nanoid(32);
  await db.purchase.create({
    data: {
      courseId,
      name,
      email: emailResult.data,
      amountCents: 0,
      stripeSessionId: `free_${downloadToken}`,
      status: "paid",
      downloadToken,
    },
  });

  redirect(`/courses/${courseId}?token=${downloadToken}`);
}

export async function startCourseCheckout(
  courseId: string,
  _prevState: CourseActionState,
  formData: FormData
): Promise<CourseActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const emailResult = EmailSchema.safeParse(formData.get("email"));

  if (!name) return { error: "Name is required" };
  if (!emailResult.success) return { error: emailResult.error.issues[0]?.message };

  if (!isStripeConfigured()) {
    return {
      error:
        "Online payments aren't set up yet. Please contact us directly to purchase this course.",
    };
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) return { error: "Course not found" };
  if (course.priceCents <= 0) return { error: "This course is free" };

  const downloadToken = nanoid(32);
  const origin = await getSiteOrigin();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: emailResult.data,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: course.priceCents,
          product_data: { name: course.title },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/courses/success?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}`,
    cancel_url: `${origin}/courses`,
  });

  await db.purchase.create({
    data: {
      courseId,
      name,
      email: emailResult.data,
      amountCents: course.priceCents,
      stripeSessionId: session.id,
      status: "pending",
      downloadToken,
    },
  });

  if (!session.url) return { error: "Could not start checkout. Please try again." };
  redirect(session.url);
}
