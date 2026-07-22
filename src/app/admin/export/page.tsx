import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate, formatMoney } from "@/lib/format";

export default async function ExportPage() {
  await requireAdmin();

  const [signups, purchases] = await Promise.all([
    db.signup.findMany({
      include: { classSession: true },
      orderBy: { createdAt: "desc" },
    }),
    db.purchase.findMany({
      include: { material: true, course: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Data export</h1>
      <p className="mt-1 text-sm text-slate-500">
        Browse class signups and purchases here, or download either list as a
        CSV file to open in Google Sheets, Excel, or similar.
      </p>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Class signups <span className="font-normal text-slate-400">({signups.length})</span>
          </h2>
          <a
            href="/api/admin/export/signups"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Download CSV
          </a>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Name</th>
                <th className="whitespace-nowrap px-4 py-3">Email</th>
                <th className="whitespace-nowrap px-4 py-3">Phone</th>
                <th className="whitespace-nowrap px-4 py-3">Family size</th>
                <th className="whitespace-nowrap px-4 py-3">Class</th>
                <th className="whitespace-nowrap px-4 py-3">Class date</th>
                <th className="whitespace-nowrap px-4 py-3">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {signups.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.familySize ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.classSession.title}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatClassDate(s.classSession.startsAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatClassDate(s.createdAt)}</td>
                </tr>
              ))}
              {signups.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No signups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Purchases <span className="font-normal text-slate-400">({purchases.length})</span>
          </h2>
          <a
            href="/api/admin/export/purchases"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Download CSV
          </a>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Name</th>
                <th className="whitespace-nowrap px-4 py-3">Email</th>
                <th className="whitespace-nowrap px-4 py-3">Item</th>
                <th className="whitespace-nowrap px-4 py-3">Amount</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Purchased</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {p.material?.title ?? p.course?.title ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatMoney(p.amountCents)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatClassDate(p.createdAt)}</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No purchases yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
