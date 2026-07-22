const FLOATING_BADGES = [
  { label: "750", sublabel: "Equifax", className: "left-[2%] top-[6%] rotate-[-6deg]" },
  { label: "800", sublabel: "Experian", className: "right-[4%] top-[2%] rotate-[4deg]" },
  { label: "760", sublabel: "TransUnion", className: "right-[-2%] top-[38%] rotate-[-3deg]" },
  { label: "Mortgage Ready", sublabel: null, className: "left-[-4%] top-[42%] rotate-[3deg]" },
  { label: "Explore Lower Rates", sublabel: null, className: "left-[2%] bottom-[16%] rotate-[-4deg]" },
  {
    label: "Down Payment Assistance",
    sublabel: null,
    className: "right-[-2%] bottom-[-2%] rotate-[5deg]",
  },
];

export default function HomeownershipHeroGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-md py-6">
      <svg
        viewBox="0 0 400 300"
        className="w-full"
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

      {FLOATING_BADGES.map((badge) => (
        <div
          key={badge.label}
          className={`absolute rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-md ${badge.className}`}
        >
          {badge.sublabel ? (
            <>
              <span className="text-sm font-bold">{badge.label}</span>{" "}
              <span className="font-medium text-slate-500">{badge.sublabel}</span>
            </>
          ) : (
            badge.label
          )}
        </div>
      ))}
    </div>
  );
}
