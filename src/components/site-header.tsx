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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span
            className="animate-logo-shimmer bg-clip-text text-lg font-bold text-transparent [-webkit-text-stroke:0.3px_rgba(30,64,175,0.25)]"
            style={{ backgroundImage: "linear-gradient(90deg, #2563eb, #ffffff, #dc2626, #ffffff, #2563eb)" }}
          >
            {site.name}
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline">{site.shortName}</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 sm:gap-2 sm:pl-4">
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
    </header>
  );
}
