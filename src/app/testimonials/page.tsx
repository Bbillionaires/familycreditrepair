import { db } from "@/lib/db";
import VideoEmbed from "@/components/video-embed";

export const metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const testimonials = await db.testimonial.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Family stories</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Hear directly from families who&apos;ve taken our free credit education
        classes.
      </p>

      {testimonials.length === 0 ? (
        <p className="mt-8 text-slate-500">No testimonials published yet &mdash; check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-200 p-4">
              <div className="aspect-video overflow-hidden rounded-md bg-slate-100">
                <VideoEmbed url={t.videoUrl} title={t.name} />
              </div>
              <p className="mt-3 font-semibold text-slate-900">{t.name}</p>
              {t.quote && <p className="mt-1 text-sm text-slate-600">&ldquo;{t.quote}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
