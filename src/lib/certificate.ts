import "server-only";
import { db } from "@/lib/db";

export async function maybeIssueCertificate(userId: string): Promise<void> {
  const existing = await db.certificate.findUnique({ where: { userId } });
  if (existing) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (!user.isComped && user.membershipStatus !== "active") return;

  const hasPassingAttempt = await db.quizAttempt.findFirst({ where: { userId, passed: true } });
  if (!hasPassingAttempt) return;

  // "Every currently-published course with at least one lesson" — always
  // computed against the live published-course set, so an admin unpublishing
  // a course (or removing its last lesson) automatically excludes it from
  // this check for everyone going forward. This never affects a Certificate
  // already issued to someone else, since issuance is a one-time, permanent
  // event (see reasoning below) — it only affects who becomes newly eligible.
  const coursesWithLessons = await db.course.findMany({
    where: { published: true, lessons: { some: {} } },
    include: { lessons: { select: { id: true } } },
  });

  for (const course of coursesWithLessons) {
    const completedCount = await db.lessonCompletion.count({
      where: { userId, lessonId: { in: course.lessons.map((l) => l.id) } },
    });
    if (completedCount < course.lessons.length) return;
  }

  // All conditions hold. Guard against a rare race between two near-
  // simultaneous callers (e.g. a lesson-completion toggle and a quiz
  // submission landing at nearly the same moment) with try/catch around the
  // unique-constrained create, rather than a separate lock — the `userId`
  // unique constraint on Certificate makes a duplicate insert impossible at
  // the database level; the loser of the race just gets a (harmless,
  // already-satisfied) constraint violation here, which we swallow.
  try {
    await db.certificate.create({ data: { userId } });
  } catch {
    // Already issued by a concurrent call — nothing to do.
  }
}
