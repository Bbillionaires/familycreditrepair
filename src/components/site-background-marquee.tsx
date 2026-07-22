"use client";

import { usePathname } from "next/navigation";
import FloatingBadgesMarquee from "./floating-badges-marquee";

// The admin back office keeps a clean, distraction-free working UI — this
// decorative marketing background is for the public site only.
export default function SiteBackgroundMarquee() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <FloatingBadgesMarquee />;
}
