const FLOATING_BADGES = [
  { label: "750", sublabel: "Equifax", className: "left-[0%] top-[4%]", delay: "0s" },
  { label: "800", sublabel: "Experian", className: "right-[2%] top-[0%]", delay: "1.2s" },
  { label: "760", sublabel: "TransUnion", className: "right-[-4%] top-[40%]", delay: "2.4s" },
  { label: "Mortgage Ready", sublabel: null, className: "left-[-6%] top-[46%]", delay: "0.8s" },
  { label: "Explore Lower Rates", sublabel: null, className: "left-[0%] bottom-[14%]", delay: "2s" },
  {
    label: "Down Payment Assistance",
    sublabel: null,
    className: "right-[-4%] bottom-[-2%]",
    delay: "1.6s",
  },
];

export default function HomeownershipHeroGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-md py-6">
      {/* Floating badges sit behind the illustration, muted and low-contrast so
          they read as background texture rather than competing with the
          foreground scene or the page's actual copy/CTAs. */}
      {FLOATING_BADGES.map((badge) => (
        <div
          key={badge.label}
          className={`animate-gentle-float absolute z-0 rounded-full bg-slate-100/70 px-3 py-1 text-xs font-medium text-slate-400 ${badge.className}`}
          style={{ animationDelay: badge.delay }}
        >
          {badge.sublabel ? (
            <>
              <span className="font-semibold text-slate-400">{badge.label}</span>{" "}
              <span className="text-slate-400/80">{badge.sublabel}</span>
            </>
          ) : (
            badge.label
          )}
        </div>
      ))}

      <svg
        viewBox="0 0 400 300"
        className="relative z-10 w-full drop-shadow-sm"
        role="img"
        aria-label="Illustration of a family standing in front of a house with a Just Purchased yard sign"
      >
        <rect x="0" y="0" width="400" height="300" fill="#eff6ff" rx="16" />
        <rect x="0" y="230" width="400" height="70" fill="#dcfce7" />

        {/* House */}
        <rect x="130" y="120" width="160" height="110" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" />
        <polygon points="120,120 210,60 300,120" fill="#1d4ed8" />
        <rect x="195" y="170" width="30" height="60" fill="#1d4ed8" />
        <rect x="145" y="140" width="30" height="30" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="2" />
        <rect x="245" y="140" width="30" height="30" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="2" />

        {/* Yard sign */}
        <rect x="55" y="205" width="4" height="45" fill="#78350f" />
        <rect x="20" y="180" width="80" height="30" rx="4" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
        <text
          x="60"
          y="199"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#1d4ed8"
          fontFamily="system-ui, sans-serif"
        >
          JUST PURCHASED
        </text>

        {/* Family — simple flat figures, not a real photo */}
        <g>
          <circle cx="330" cy="205" r="12" fill="#fcd34d" />
          <rect x="316" y="217" width="28" height="40" rx="10" fill="#2563eb" />
        </g>
        <g>
          <circle cx="360" cy="210" r="10" fill="#f59e0b" />
          <rect x="348" y="220" width="24" height="35" rx="9" fill="#f472b6" />
        </g>
        <g>
          <circle cx="345" cy="240" r="7" fill="#fde68a" />
          <rect x="337" y="247" width="16" height="25" rx="7" fill="#34d399" />
        </g>
      </svg>
    </div>
  );
}
