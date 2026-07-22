// Full-width background layer that drifts slowly across the entire hero
// section, behind the headline/CTAs/illustration. Each image below is
// expected at /public/images/hero-badges/<file> — drop matching files in
// that folder (200x70px display size, transparent PNG/WebP, export at
// 400x140 for retina) and they'll appear automatically. Until a file
// exists, its slot just renders a broken-image icon — harmless, and easy
// to spot which ones are still missing.
const BADGES = [
  { src: "/images/hero-badges/750-equifax.png", alt: "750 Equifax" },
  { src: "/images/hero-badges/800-experian.png", alt: "800 Experian" },
  { src: "/images/hero-badges/760-transunion.png", alt: "760 TransUnion" },
  { src: "/images/hero-badges/mortgage-ready.png", alt: "Mortgage Ready" },
  { src: "/images/hero-badges/lower-rates.png", alt: "Explore Lower Rates" },
  { src: "/images/hero-badges/down-payment-assistance.png", alt: "Down Payment Assistance" },
];

// Rendered twice back-to-back so the marquee can loop seamlessly at -50%.
const TRACK = [...BADGES, ...BADGES];

export default function FloatingBadgesMarquee() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden opacity-30 grayscale"
    >
      <div className="animate-marquee flex w-max shrink-0 items-center gap-10">
        {TRACK.map((badge, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${badge.src}-${i}`}
            src={badge.src}
            alt={badge.alt}
            width={200}
            height={70}
            className="h-[70px] w-[200px] shrink-0 object-contain"
          />
        ))}
      </div>
    </div>
  );
}
