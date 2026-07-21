import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import VideoEmbed from "@/components/video-embed";
import CourseUnlockForm from "./course-unlock-form";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const course = await db.course.findUnique({
    where: { id },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course || !course.published) notFound();

  let hasAccess = false;
  if (token) {
    const purchase = await db.purchase.findUnique({ where: { downloadToken: token } });
    hasAccess = !!purchase && purchase.courseId === course.id && purchase.status === "paid";
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
      <p className="mt-2 text-slate-600">{course.description}</p>
      <p className="mt-3 text-sm font-semibold text-slate-800">{formatMoney(course.priceCents)}</p>

      {!hasAccess ? (
        <>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900">What&apos;s included</h2>
            <ul className="mt-4 space-y-2">
              {course.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  {lesson.title}
                </li>
              ))}
              {course.lessons.length === 0 && (
                <li className="text-sm text-slate-500">Lessons coming soon.</li>
              )}
            </ul>
          </div>
          <div className="mt-8 max-w-sm">
            <CourseUnlockForm courseId={course.id} isFree={course.priceCents === 0} />
          </div>
        </>
      ) : (
        <div className="mt-8 space-y-8">
          {course.lessons.map((lesson) => (
            <div key={lesson.id} className="rounded-lg border border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900">{lesson.title}</h2>
              {lesson.content && (
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  {lesson.content.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}
              {lesson.videoUrl && (
                <div className="mt-4 aspect-video overflow-hidden rounded-md bg-slate-100">
                  <VideoEmbed url={lesson.videoUrl} title={lesson.title} />
                </div>
              )}
              {lesson.fileUrl && (
                <a
                  href={`/api/courses/${course.id}/lessons/${lesson.id}/file?token=${token}`}
                  className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Download lesson file
                </a>
              )}
            </div>
          ))}
          {course.lessons.length === 0 && (
            <p className="text-slate-500">Lessons coming soon.</p>
          )}
        </div>
      )}
    </div>
  );
}
