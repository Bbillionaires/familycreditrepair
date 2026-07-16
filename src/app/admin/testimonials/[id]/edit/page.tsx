import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import TestimonialForm from "../../testimonial-form";
import { updateTestimonial } from "../../actions";

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const testimonial = await db.testimonial.findUnique({ where: { id } });
  if (!testimonial) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Edit testimonial</h1>
      <div className="mt-6">
        <TestimonialForm
          action={updateTestimonial.bind(null, id)}
          submitLabel="Save changes"
          defaultValues={testimonial}
        />
      </div>
    </div>
  );
}
