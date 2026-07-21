import ForgotUsernameForm from "./forgot-username-form";

export default function ForgotUsernamePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Forgot your username?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send it to you.
        </p>
        <ForgotUsernameForm />
      </div>
    </div>
  );
}
