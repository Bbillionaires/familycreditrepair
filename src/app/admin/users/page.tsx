import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate } from "@/lib/format";
import { toggleComp } from "./actions";

function MembershipBadge({
  isComped,
  membershipStatus,
}: {
  isComped: boolean;
  membershipStatus: string;
}) {
  if (isComped) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Comped
      </span>
    );
  }
  if (membershipStatus === "active") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Active
      </span>
    );
  }
  if (membershipStatus === "past_due") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
        Past due
      </span>
    );
  }
  if (membershipStatus === "canceled") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
        Canceled
      </span>
    );
  }
  return <span className="text-slate-400">—</span>;
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Membership</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <MembershipBadge isComped={u.isComped} membershipStatus={u.membershipStatus} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatClassDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleComp.bind(null, u.id)}>
                    <button type="submit" className="text-blue-600 hover:underline">
                      {u.isComped ? "Un-comp" : "Comp"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
