import { requireAdmin } from "@/lib/dal";
import ClassForm from "../class-form";
import { createClass } from "../actions";

export default async function NewClassPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add class</h1>
      <div className="mt-6">
        <ClassForm action={createClass} submitLabel="Create class" />
      </div>
    </div>
  );
}
