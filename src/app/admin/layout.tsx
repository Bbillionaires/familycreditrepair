import Link from "next/link";
import { verifyAdminSession } from "@/lib/session";
import { logoutAction } from "./auth-actions";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/mentors", label: "Mentors" },
  { href: "/admin/mentoring", label: "Mentoring requests" },
  { href: "/admin/chat-settings", label: "Chat Settings" },
  { href: "/admin/export", label: "Export" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await verifyAdminSession();

  if (!isAdmin) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
