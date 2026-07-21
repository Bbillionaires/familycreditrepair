import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import ChangePasswordForm from "./change-password-form";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">My account</h1>

      <div className="mt-6 rounded-lg border border-slate-200 p-5">
        <p className="text-sm text-slate-500">Username</p>
        <p className="font-medium text-slate-900">{user.username}</p>
        <p className="mt-3 text-sm text-slate-500">Email</p>
        <p className="font-medium text-slate-900">{user.email}</p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
        <ChangePasswordForm />
      </div>

      <form action={logoutAction} className="mt-8">
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
