import { requireAdmin } from "@/lib/dal";
import MentorForm from "../mentor-form";
import { createMentor } from "../actions";

export default async function NewMentorPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add mentor</h1>
      <div className="mt-6">
        <MentorForm action={createMentor} submitLabel="Create mentor" />
      </div>
    </div>
  );
}
