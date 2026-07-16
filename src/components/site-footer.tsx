import Link from "next/link";
import { site } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-base font-semibold text-slate-900">{site.name}</p>
            <p className="mt-2 text-sm text-slate-500">{site.tagline}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Explore</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li><Link href="/testimonials" className="hover:text-slate-900">Testimonials</Link></li>
              <li><Link href="/materials" className="hover:text-slate-900">Free &amp; Paid Resources</Link></li>
              <li><Link href="/calendar" className="hover:text-slate-900">Classes &amp; Calendar</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Our disclaimer</p>
            <p className="mt-2 text-sm text-slate-500">{site.freeClassesDisclaimer}</p>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-400">{site.generalDisclaimer}</p>
          <p className="mt-2 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
