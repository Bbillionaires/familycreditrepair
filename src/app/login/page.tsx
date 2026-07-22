import Link from "next/link";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back.</p>
        <LoginForm />
        <div className="mt-4 space-y-1 text-center text-sm text-slate-500">
          <p>
            <Link href="/account/forgot-username" className="text-blue-600 hover:underline">
              Forgot username?
            </Link>{" "}
            &middot;{" "}
            <Link href="/account/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </p>
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
