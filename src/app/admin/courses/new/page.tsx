import { requireAdmin } from "@/lib/dal";
import CourseForm from "../course-form";
import { createCourse } from "../actions";

export default async function NewCoursePage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add course</h1>
      <div className="mt-6">
        <CourseForm action={createCourse} submitLabel="Create course" />
      </div>
    </div>
  );
}
