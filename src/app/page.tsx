import Link from "next/link";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import DisclaimerBanner from "@/components/disclaimer-banner";
import VideoEmbed from "@/components/video-embed";
import HomeownershipHeroGraphic from "@/components/homeownership-hero-graphic";
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
        <div className="grid items-center gap-10 lg:grid-cols-2">
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
          <div>
            <HomeownershipHeroGraphic />
            <p className="mx-auto mt-2 max-w-md text-center text-xs text-slate-400">
              Illustrative example only &mdash; not a guarantee of your results, and we
              are not affiliated with Equifax, Experian, or TransUnion.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              What actually goes into your credit score
            </h2>
            <p className="mt-3 text-slate-600">
              Your score is built from a handful of factors &mdash; and once you know
              what they are, you can make targeted changes instead of guessing.
              We break each one down in our free classes and guides.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  &#10003;
                </span>
                <span>
                  <span className="font-semibold">Payment history</span> &mdash; paying on
                  time, every time
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  &#10003;
                </span>
                <span>
                  <span className="font-semibold">Credit utilization</span> &mdash; how
                  much of your available credit you&rsquo;re using
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  &#10003;
                </span>
                <span>
                  <span className="font-semibold">Length of credit history</span> &mdash;
                  how long your accounts have been open
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  &#10003;
                </span>
                <span>
                  <span className="font-semibold">Credit mix</span> &mdash; the variety of
                  account types you manage
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  &#10003;
                </span>
                <span>
                  <span className="font-semibold">New credit</span> &mdash; how often
                  you&rsquo;re opening new accounts
                </span>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/calendar"
                className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Learn more in a free class
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative z-10 mx-auto w-full max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/credit-score-phone.webp"
                alt="A phone showing a credit score breakdown, including payment history, credit utilization, credit age, credit mix, and new credit"
                width={700}
                height={831}
                className="w-full drop-shadow-sm"
              />
            </div>
            <p className="mx-auto mt-2 max-w-xs text-center text-xs text-slate-400">
              Illustrative example only &mdash; not a guarantee of your results.
            </p>
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
