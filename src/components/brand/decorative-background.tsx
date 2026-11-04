import { cn } from "@/lib/utils";

// Soft waves and node network from the Style Guide (DESIGN.md 2.4). Purely
// decorative. `placement` positions it; by default it fills its positioned parent.
export function DecorativeBackground({ placement = "absolute inset-0" }: { placement?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none -z-10 overflow-hidden", placement)}>
      <svg
        className="absolute bottom-0 left-0 h-64 w-full opacity-40"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#6B3BFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {[0, 18, 36, 54].map((shift) => (
          <path
            key={shift}
            d={`M0 ${200 + shift} C 360 ${120 + shift}, 720 ${300 + shift}, 1080 ${180 + shift} S 1440 ${220 + shift}, 1440 ${220 + shift}`}
            fill="none"
            stroke="url(#wave)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <svg className="absolute -top-6 -left-6 size-56 opacity-30" viewBox="0 0 200 200">
        <g stroke="#A78BFA" strokeWidth="1">
          <line x1="30" y1="40" x2="90" y2="70" />
          <line x1="90" y1="70" x2="150" y2="40" />
          <line x1="90" y1="70" x2="110" y2="140" />
          <line x1="110" y1="140" x2="40" y2="160" />
          <line x1="110" y1="140" x2="170" y2="120" />
        </g>
        <g fill="#8B5CFF">
          {[
            [30, 40],
            [90, 70],
            [150, 40],
            [110, 140],
            [40, 160],
            [170, 120],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />
          ))}
        </g>
      </svg>
    </div>
  );
}
