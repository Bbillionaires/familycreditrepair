import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import CourseForm from "../../course-form";
import { updateCourse } from "../../actions";

export default async function EditCoursePage({
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
      <h1 className="text-2xl font-semibold text-slate-900">Edit course</h1>
      <div className="mt-6">
        <CourseForm
          action={updateCourse.bind(null, id)}
          submitLabel="Save changes"
          defaultValues={course}
        />
      </div>
    </div>
  );
}
