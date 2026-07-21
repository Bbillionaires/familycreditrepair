import Link from "next/link";
import { db } from "@/lib/db";
import ResetPasswordForm from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const user = token
    ? await db.user.findUnique({ where: { resetToken: token } })
    : null;
  const isValid = Boolean(
    user && user.resetTokenExpiresAt && user.resetTokenExpiresAt > new Date()
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
        {isValid && token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            This link is invalid or has expired. Please request a new one from the{" "}
            <Link href="/account/forgot-password" className="underline">
              forgot password
            </Link>{" "}
            page.
          </p>
        )}
      </div>
    </div>
  );
}
