import { db } from "@/lib/db";
import DisclaimerBanner from "@/components/disclaimer-banner";
import { formatClassDate } from "@/lib/format";
import SignupForm from "./signup-form";

export const metadata = { title: "Classes & Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const classes = await db.classSession.findMany({
    where: { published: true, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { signups: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Classes &amp; calendar</h1>
      <p className="mt-2 text-slate-600">
        Reserve a spot in one of our upcoming credit education classes.
      </p>
      <div className="mt-4">
        <DisclaimerBanner />
      </div>

      {classes.length === 0 ? (
        <p className="mt-10 text-slate-500">
          No upcoming classes are scheduled right now &mdash; check back soon.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {classes.map((c) => {
            const spotsLeft = c.capacity ? c.capacity - c._count.signups : null;
            const isFull = spotsLeft !== null && spotsLeft <= 0;

            return (
              <div key={c.id} className="rounded-lg border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      {formatClassDate(c.startsAt)} &middot; {c.durationMinutes} min
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{c.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{c.location}</p>
                    {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
                    {spotsLeft !== null && !isFull && (
                      <p className="mt-2 text-xs text-slate-400">{spotsLeft} spot(s) left</p>
                    )}
                  </div>
                  <div className="w-full sm:w-64">
                    {isFull ? (
                      <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-500">
                        This class is full
                      </p>
                    ) : (
                      <SignupForm classSessionId={c.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
