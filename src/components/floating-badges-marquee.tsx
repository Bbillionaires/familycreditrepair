// Fixed, viewport-anchored background layer scattered across the entire
// site (every public page — rendered once from the root layout, not
// per-page), sitting behind normal page content via a negative z-index. It
// naturally shows through wherever a page has no opaque background of its
// own (margins, gaps between cards) and stays hidden behind anything that
// does (forms, tables, cards) — no per-page changes needed. Each image
// below is expected at /public/images/hero-badges/<file> — drop matching
// files in that folder (200x70px display size, transparent PNG/WebP, export
// at 400x140 for retina) and they'll appear automatically.
const BADGES = {
  equifax: { src: "/images/hero-badges/750-equifax.png", alt: "750 Equifax" },
  experian: { src: "/images/hero-badges/800-experian.png", alt: "800 Experian" },
  transunion: { src: "/images/hero-badges/760-transunion.png", alt: "760 TransUnion" },
  mortgageReady: { src: "/images/hero-badges/mortgage-ready.png", alt: "Mortgage Ready" },
  lowerRates: { src: "/images/hero-badges/lower-rates.png", alt: "Explore Lower Rates" },
  downPayment: { src: "/images/hero-badges/down-payment-assistance.png", alt: "Down Payment Assistance" },
};

// Scattered across the full viewport (top/left as % of viewport) instead of
// lined up in a single row — each with its own size, base rotation,
// animation duration, and delay so none of them move in lockstep.
const INSTANCES = [
  { badge: BADGES.equifax, top: "6%", left: "8%", width: 170, rot: -8, duration: 11, delay: 0 },
  { badge: BADGES.experian, top: "10%", left: "68%", width: 190, rot: 6, duration: 13, delay: 1.5 },
  { badge: BADGES.mortgageReady, top: "22%", left: "38%", width: 160, rot: -4, duration: 10, delay: 3 },
  { badge: BADGES.lowerRates, top: "34%", left: "12%", width: 180, rot: 7, duration: 14, delay: 0.8 },
  { badge: BADGES.downPayment, top: "40%", left: "78%", width: 175, rot: -6, duration: 12, delay: 2.2 },
  { badge: BADGES.transunion, top: "52%", left: "50%", width: 165, rot: 4, duration: 15, delay: 4 },
  { badge: BADGES.experian, top: "62%", left: "6%", width: 150, rot: -5, duration: 11, delay: 1 },
  { badge: BADGES.equifax, top: "68%", left: "72%", width: 185, rot: 8, duration: 13, delay: 3.5 },
  { badge: BADGES.lowerRates, top: "78%", left: "32%", width: 160, rot: -7, duration: 12, delay: 0.4 },
  { badge: BADGES.mortgageReady, top: "84%", left: "58%", width: 170, rot: 5, duration: 10, delay: 2.8 },
  { badge: BADGES.downPayment, top: "16%", left: "22%", width: 150, rot: 9, duration: 14, delay: 4.5 },
  { badge: BADGES.transunion, top: "90%", left: "40%", width: 155, rot: -6, duration: 11, delay: 1.8 },
];

export default function FloatingBadgesMarquee() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-45">
      {INSTANCES.map((instance, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={instance.badge.src}
          alt={instance.badge.alt}
          width={instance.width}
          height={Math.round(instance.width * 0.35)}
          className="animate-float-scatter absolute object-contain"
          style={
            {
              top: instance.top,
              left: instance.left,
              width: instance.width,
              "--rot": `${instance.rot}deg`,
              animationDuration: `${instance.duration}s`,
              animationDelay: `${instance.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
