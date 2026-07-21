import { db } from "@/lib/db";
import CourseCard from "@/components/course-card";

export const metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const free = courses.filter((c) => c.priceCents === 0);
  const paid = courses.filter((c) => c.priceCents > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Courses</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Structured, self-paced courses to go deeper on a topic. Attending our
        live classes is always free &mdash; these are optional extras.
      </p>

      <Section title="Free courses" items={free} />
      <Section title="Paid courses" items={paid} />

      {courses.length === 0 && (
        <p className="mt-8 text-slate-500">No courses are published yet &mdash; check back soon.</p>
      )}
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    description: string;
    priceCents: number;
    imageUrl: string | null;
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </div>
  );
}
