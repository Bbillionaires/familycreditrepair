import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import MentorForm from "../../mentor-form";
import { updateMentor } from "../../actions";

export default async function EditMentorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const mentor = await db.mentor.findUnique({ where: { id } });
  if (!mentor) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Edit mentor</h1>
      <div className="mt-6">
        <MentorForm
          action={updateMentor.bind(null, id)}
          submitLabel="Save changes"
          defaultValues={{
            ...mentor,
            sessionRateDollars: mentor.sessionRateCents ? mentor.sessionRateCents / 100 : null,
          }}
        />
      </div>
    </div>
  );
}
