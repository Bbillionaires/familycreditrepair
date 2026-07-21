import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import LessonForm from "../../lesson-form";
import { updateLesson } from "../../actions";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireAdmin();
  const { id, lessonId } = await params;

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== id) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Edit lesson</h1>
      <div className="mt-6">
        <LessonForm
          action={updateLesson.bind(null, lesson.id)}
          submitLabel="Save changes"
          defaultValues={lesson}
        />
      </div>
    </div>
  );
}
