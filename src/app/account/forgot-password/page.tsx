import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
