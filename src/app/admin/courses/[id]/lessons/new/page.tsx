import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import LessonForm from "../lesson-form";
import { createLesson } from "../actions";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const course = await db.course.findUnique({ where: { id } });
  if (!course) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add lesson to {course.title}</h1>
      <div className="mt-6">
        <LessonForm action={createLesson.bind(null, course.id)} submitLabel="Create lesson" />
      </div>
    </div>
  );
}
