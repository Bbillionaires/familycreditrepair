import { db } from "@/lib/db";
import MentorRequestForm from "./mentor-request-form";

export const metadata = { title: "1-on-1 Mentoring" };
export const dynamic = "force-dynamic";

export default async function MentoringPage() {
  const mentors = await db.mentor.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">1-on-1 mentoring</h1>
      <p className="mt-2 text-slate-600">
        Request a session with one of our mentors. This doesn&apos;t book anything
        automatically — a mentor or admin reviews every request before it&apos;s
        confirmed.
      </p>

      <div className="mt-8">
        {mentors.length === 0 ? (
          <p className="text-slate-500">
            1-on-1 mentoring isn&apos;t available to request right now — check back soon.
          </p>
        ) : (
          <MentorRequestForm
            mentors={mentors.map((m) => ({
              id: m.id,
              name: m.name,
              sessionRateCents: m.sessionRateCents,
              bio: m.bio,
            }))}
          />
        )}
      </div>
    </div>
  );
}
