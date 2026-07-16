import Link from "next/link";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import DisclaimerBanner from "@/components/disclaimer-banner";
import VideoEmbed from "@/components/video-embed";
import { formatClassDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [testimonials, materials, classes] = await Promise.all([
    db.testimonial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 3,
    }),
    db.material.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 3,
    }),
    db.classSession.findMany({
      where: { published: true, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
  ]);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {site.tagline}
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            We teach families how credit works through free live classes, real
            testimonials, and practical guides &mdash; so you can make informed
            decisions with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/calendar"
              className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign up for a free class
            </Link>
            <Link
              href="/materials"
              className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Browse free &amp; paid resources
            </Link>
          </div>
          <div className="mt-8">
            <DisclaimerBanner />
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Family stories</h2>
            <Link href="/testimonials" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 p-4">
                <div className="aspect-video overflow-hidden rounded-md bg-slate-100">
                  <VideoEmbed url={t.videoUrl} title={t.name} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{t.name}</p>
                {t.quote && <p className="mt-1 text-sm text-slate-600">&ldquo;{t.quote}&rdquo;</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {classes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Upcoming free classes</h2>
            <Link href="/calendar" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              See full calendar &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {classes.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-medium text-blue-600">{formatClassDate(c.startsAt)}</p>
                <p className="mt-1 font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 text-sm text-slate-500">{c.location}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {materials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Guides &amp; downloads</h2>
            <Link href="/materials" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View library &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {materials.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{m.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{m.description}</p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {formatMoney(m.priceCents)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
