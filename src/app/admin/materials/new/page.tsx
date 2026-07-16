import { requireAdmin } from "@/lib/dal";
import MaterialForm from "../material-form";
import { createMaterial } from "../actions";

export default async function NewMaterialPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add material</h1>
      <div className="mt-6">
        <MaterialForm action={createMaterial} submitLabel="Create material" />
      </div>
    </div>
  );
}
