import type { DrillSetup } from "@/lib/types";

/* The playing surface is 200 × 100 user units — both billiard and snooker
   tables are twice as long as they are wide — so normalised setup coordinates
   map straight onto it. */
const W = 200;
const H = 100;
const CUSHION = 9;
const BALL_R = 4.2;
const POCKET_R = 5.2;

const PAINT = {
  cushion: { fill: "var(--color-elevated)", stroke: "var(--color-line-strong)" },
  cloth: { fill: "var(--color-surface)", stroke: "var(--color-line)" },
  pocket: { fill: "var(--color-canvas)", stroke: "var(--color-line-strong)" },
  cue: { fill: "var(--color-ink)", stroke: "var(--color-muted)" },
  object: { fill: "var(--color-accent)", stroke: "var(--color-accent-ink)" },
  blocker: { fill: "var(--color-faint)", stroke: "var(--color-muted)" },
} as const;

/**
 * A drill's starting layout, drawn rather than photographed.
 *
 * A player setting up needs exact ball positions, which a diagram states and a
 * photograph only implies. An owner-supplied image always takes precedence.
 */
export function TableDiagram({ setup, title }: { setup: DrillSetup; title: string }) {
  const balls = setup.balls ?? [];
  const zones = setup.zones ?? [];
  const aims = setup.aims ?? [];
  const isSnooker = setup.table === "snooker";

  const baulkX = W * 0.2;
  const dRadius = H * 0.19;

  return (
    <figure className="m-0">
      <svg
        viewBox={`${-CUSHION} ${-CUSHION} ${W + CUSHION * 2} ${H + CUSHION * 2}`}
        className="block h-auto w-full"
        role="img"
        aria-label={describe(setup, title)}
      >
        <rect
          x={-CUSHION}
          y={-CUSHION}
          width={W + CUSHION * 2}
          height={H + CUSHION * 2}
          rx={CUSHION * 0.8}
          fill={PAINT.cushion.fill}
          stroke={PAINT.cushion.stroke}
          strokeWidth={0.8}
        />
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          rx={1.5}
          fill={PAINT.cloth.fill}
          stroke={PAINT.cloth.stroke}
          strokeWidth={0.6}
        />

        {isSnooker && (
          <>
            <line
              x1={baulkX}
              y1={0}
              x2={baulkX}
              y2={H}
              stroke={PAINT.cloth.stroke}
              strokeWidth={0.6}
            />
            <path
              d={`M ${baulkX} ${H / 2 - dRadius} A ${dRadius} ${dRadius} 0 0 0 ${baulkX} ${H / 2 + dRadius}`}
              fill="none"
              stroke={PAINT.cloth.stroke}
              strokeWidth={0.6}
            />
          </>
        )}

        {[0.25, 0.5, 0.75].map((fraction) => (
          <circle
            key={fraction}
            cx={W * fraction}
            cy={H / 2}
            r={0.9}
            fill={PAINT.cloth.stroke}
          />
        ))}

        {POCKETS.map(([cx, cy], index) => (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={POCKET_R}
            fill={PAINT.pocket.fill}
            stroke={PAINT.pocket.stroke}
            strokeWidth={0.6}
          />
        ))}

        {zones.map((zone, index) => (
          <g key={`zone-${index}`}>
            <rect
              x={zone.x * W}
              y={zone.y * H}
              width={zone.w * W}
              height={zone.h * H}
              rx={2}
              fill="color-mix(in srgb, var(--color-accent) 12%, transparent)"
              stroke="var(--color-accent-ink)"
              strokeWidth={0.7}
              strokeDasharray="3 2.5"
            />
            {zone.label && (
              <text
                x={(zone.x + zone.w / 2) * W}
                y={(zone.y + zone.h / 2) * H}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-accent-ink)"
                fontSize={6}
              >
                {zone.label}
              </text>
            )}
          </g>
        ))}

        {aims.map((aim, index) => (
          <line
            key={`aim-${index}`}
            x1={aim.from[0] * W}
            y1={aim.from[1] * H}
            x2={aim.to[0] * W}
            y2={aim.to[1] * H}
            stroke="var(--color-faint)"
            strokeWidth={0.6}
            strokeDasharray="2.5 2.5"
          />
        ))}

        {balls.map((ball, index) => {
          const paint = PAINT[ball.role] ?? PAINT.object;
          return (
            <g key={`ball-${index}`}>
              <circle
                cx={ball.x * W}
                cy={ball.y * H}
                r={BALL_R}
                fill={paint.fill}
                stroke={paint.stroke}
                strokeWidth={0.8}
              />
              {ball.label && (
                <text
                  x={ball.x * W}
                  y={ball.y * H + BALL_R + 5.5}
                  textAnchor="middle"
                  fill="var(--color-muted)"
                  fontSize={5.5}
                >
                  {ball.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-faint">
        {balls.some((b) => b.role === "cue") && <Key paint={PAINT.cue}>Cue ball</Key>}
        {balls.some((b) => b.role === "object") && <Key paint={PAINT.object}>Object ball</Key>}
        {balls.some((b) => b.role === "blocker") && <Key paint={PAINT.blocker}>Blocker</Key>}
        {zones.length > 0 && (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-dashed"
              style={{
                borderColor: "var(--color-accent-ink)",
                background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              }}
            />
            Target area
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function Key({
  paint,
  children,
}: {
  paint: { fill: string; stroke: string };
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{ background: paint.fill, borderColor: paint.stroke }}
      />
      {children}
    </span>
  );
}

const POCKETS: [number, number][] = [
  [0, 0],
  [W / 2, 0],
  [W, 0],
  [0, H],
  [W / 2, H],
  [W, H],
];

/** A diagram is useless to a screen reader without this. */
function describe(setup: DrillSetup, title: string) {
  const parts = (setup.balls ?? []).map((ball) => {
    const across = ball.y < 0.34 ? "top" : ball.y > 0.66 ? "bottom" : "middle";
    const along =
      ball.x < 0.34 ? "baulk end" : ball.x > 0.66 ? "far end" : "centre of the table";
    const role =
      ball.role === "cue" ? "cue ball" : ball.role === "blocker" ? "blocking ball" : "object ball";
    return `${role} ${across} ${along}`;
  });
  return `Table setup for ${title}: ${parts.join("; ") || "no balls specified"}.`;
}
