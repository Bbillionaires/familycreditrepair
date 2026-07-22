import Link from "next/link";
import { site } from "@/lib/site";
import { verifyUserSession } from "@/lib/user-session";
import { logoutAction } from "@/app/account/actions";

const links = [
  { href: "/", label: "Home" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/materials", label: "Free & Paid Resources" },
  { href: "/calendar", label: "Classes & Calendar" },
  { href: "/free-credit-reports", label: "Free Credit Reports" },
  { href: "/courses", label: "Courses" },
];

export default async function SiteHeader() {
  const session = await verifyUserSession();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2">
            <span
              className="animate-logo-shimmer bg-clip-text text-2xl font-bold tracking-wide text-transparent [-webkit-text-stroke:0.3px_rgba(30,64,175,0.25)] sm:text-3xl"
              style={{ backgroundImage: "linear-gradient(90deg, #2563eb, #ffffff, #dc2626, #ffffff, #2563eb)" }}
            >
              {site.name}
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {session ? (
              <>
                <Link
                  href="/account"
                  className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
                >
                  My Account
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-slate-100 pt-2 sm:gap-x-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
