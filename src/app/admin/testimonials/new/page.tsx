import { requireAdmin } from "@/lib/dal";
import TestimonialForm from "../testimonial-form";
import { createTestimonial } from "../actions";

export default async function NewTestimonialPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add testimonial</h1>
      <div className="mt-6">
        <TestimonialForm action={createTestimonial} submitLabel="Create testimonial" />
      </div>
    </div>
  );
}
