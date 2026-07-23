import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate } from "@/lib/format";
import { approveMentorRequest, declineMentorRequest } from "./actions";

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Approved
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
      Declined
    </span>
  );
}

export default async function AdminMentoringPage() {
  await requireAdmin();
  const requests = await db.mentorRequest.findMany({
    include: { mentor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mentoring requests</h1>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Mentor</th>
              <th className="px-4 py-3">Preferred times</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-slate-500">{r.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.mentor?.name ?? "(mentor removed)"}</td>
                <td className="px-4 py-3 text-slate-600">{r.preferredTimes}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatClassDate(r.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === "pending" && (
                    <div className="flex justify-end gap-3">
                      <form action={approveMentorRequest.bind(null, r.id)}>
                        <button type="submit" className="text-blue-600 hover:underline">
                          Approve
                        </button>
                      </form>
                      <form action={declineMentorRequest.bind(null, r.id)}>
                        <button type="submit" className="text-red-600 hover:underline">
                          Decline
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No mentoring requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
