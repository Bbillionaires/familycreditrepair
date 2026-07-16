import { db } from "@/lib/db";
import MaterialCard from "@/components/material-card";

export const metadata = { title: "Free & Paid Resources" };
export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const materials = await db.material.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const free = materials.filter((m) => m.priceCents === 0);
  const paid = materials.filter((m) => m.priceCents > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Free &amp; paid resources</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Download our free guides any time, or purchase in-depth workbooks and
        toolkits. Attending our classes is always free &mdash; these are optional
        extras.
      </p>

      <Section title="Free downloads" items={free} />
      <Section title="Paid guides & workbooks" items={paid} />

      {materials.length === 0 && (
        <p className="mt-8 text-slate-500">No resources are published yet &mdash; check back soon.</p>
      )}
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    description: string;
    priceCents: number;
    imageUrl: string | null;
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <MaterialCard key={m.id} material={m} />
        ))}
      </div>
    </div>
  );
}
