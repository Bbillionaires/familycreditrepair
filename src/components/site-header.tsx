import Link from "next/link";
import { site } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/materials", label: "Free & Paid Resources" },
  { href: "/calendar", label: "Classes & Calendar" },
  { href: "/free-credit-reports", label: "Free Credit Reports" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">{site.name}</span>
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
      </div>
    </header>
  );
}
