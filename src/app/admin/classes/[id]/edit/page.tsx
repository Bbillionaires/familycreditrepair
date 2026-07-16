import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { toDateTimeInputValue } from "@/lib/format";
import ClassForm from "../../class-form";
import { updateClass } from "../../actions";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const classSession = await db.classSession.findUnique({ where: { id } });
  if (!classSession) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Edit class</h1>
      <div className="mt-6">
        <ClassForm
          action={updateClass.bind(null, id)}
          submitLabel="Save changes"
          defaultValues={{
            ...classSession,
            startsAtInputValue: toDateTimeInputValue(classSession.startsAt),
          }}
        />
      </div>
    </div>
  );
}
