import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import MaterialForm from "../../material-form";
import { updateMaterial } from "../../actions";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const material = await db.material.findUnique({ where: { id } });
  if (!material) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Edit material</h1>
      <div className="mt-6">
        <MaterialForm
          action={updateMaterial.bind(null, id)}
          submitLabel="Save changes"
          defaultValues={material}
        />
      </div>
    </div>
  );
}
