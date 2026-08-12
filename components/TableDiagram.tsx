import type { DrillSetup } from "@/lib/types";
import styles from "./diagram.module.css";

/* The playing surface is drawn 200 × 100 user units — billiard and snooker
   tables are both twice as long as they are wide — and everything else is
   positioned in that space. Normalised setup coordinates map straight onto it. */
const W = 200;
const H = 100;
/** Cushion thickness, outside the playing surface. */
const CUSHION = 9;
const BALL_R = 4.2;
const POCKET_R = 5.2;

const ROLE_CLASS: Record<string, string> = {
  cue: styles.ballCue,
  object: styles.ballObject,
  blocker: styles.ballBlocker,
};

/**
 * A drill's starting layout, drawn rather than photographed: the design ships
 * no raster assets, and a diagram states ball positions exactly, which is what
 * a player setting up actually needs.
 */
export function TableDiagram({
  setup,
  title,
}: {
  setup: DrillSetup;
  title: string;
}) {
  const balls = setup.balls ?? [];
  const zones = setup.zones ?? [];
  const aims = setup.aims ?? [];
  const isSnooker = setup.table === "snooker";

  // Baulk line sits a fifth up a snooker table; the D hangs off it.
  const baulkX = W * 0.2;
  const dRadius = H * 0.19;

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`${-CUSHION} ${-CUSHION} ${W + CUSHION * 2} ${H + CUSHION * 2}`}
        role="img"
        aria-label={describe(setup, title)}
      >
        {/* cushions */}
        <rect
          className={styles.cushion}
          x={-CUSHION}
          y={-CUSHION}
          width={W + CUSHION * 2}
          height={H + CUSHION * 2}
          rx={CUSHION * 0.8}
        />
        {/* playing surface */}
        <rect className={styles.cloth} x={0} y={0} width={W} height={H} rx={1.5} />

        {isSnooker && (
          <>
            <line className={styles.marking} x1={baulkX} y1={0} x2={baulkX} y2={H} />
            <path
              className={styles.marking}
              d={`M ${baulkX} ${H / 2 - dRadius} A ${dRadius} ${dRadius} 0 0 0 ${baulkX} ${H / 2 + dRadius}`}
              fill="none"
            />
          </>
        )}

        {/* spots: centre and the two quarter points, enough to judge distance */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <circle
            key={fraction}
            className={styles.spot}
            cx={W * fraction}
            cy={H / 2}
            r={0.9}
          />
        ))}

        {/* pockets */}
        {pockets().map(([cx, cy], index) => (
          <circle key={index} className={styles.pocket} cx={cx} cy={cy} r={POCKET_R} />
        ))}

        {/* target zones for the cue ball */}
        {zones.map((zone, index) => (
          <g key={`zone-${index}`}>
            <rect
              className={styles.zone}
              x={zone.x * W}
              y={zone.y * H}
              width={zone.w * W}
              height={zone.h * H}
              rx={2}
            />
            {zone.label && (
              <text
                className={styles.zoneLabel}
                x={(zone.x + zone.w / 2) * W}
                y={(zone.y + zone.h / 2) * H}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {zone.label}
              </text>
            )}
          </g>
        ))}

        {/* intended shot lines */}
        {aims.map((aim, index) => (
          <line
            key={`aim-${index}`}
            className={styles.aim}
            x1={aim.from[0] * W}
            y1={aim.from[1] * H}
            x2={aim.to[0] * W}
            y2={aim.to[1] * H}
          />
        ))}

        {/* balls last, so nothing is drawn over them */}
        {balls.map((ball, index) => (
          <g key={`ball-${index}`}>
            <circle
              className={`${styles.ball} ${ROLE_CLASS[ball.role] ?? styles.ballObject}`}
              cx={ball.x * W}
              cy={ball.y * H}
              r={BALL_R}
            />
            {ball.label && (
              <text
                className={styles.ballLabel}
                x={ball.x * W}
                y={ball.y * H + BALL_R + 5.5}
                textAnchor="middle"
              >
                {ball.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <figcaption className={styles.legend}>
        {balls.some((b) => b.role === "cue") && (
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchCue}`} /> Cue ball
          </span>
        )}
        {balls.some((b) => b.role === "object") && (
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchObject}`} /> Object ball
          </span>
        )}
        {balls.some((b) => b.role === "blocker") && (
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchBlocker}`} /> Blocker
          </span>
        )}
        {zones.length > 0 && (
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchZone}`} /> Target area
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** Corner and centre pockets, on the cushion line. */
function pockets(): [number, number][] {
  return [
    [0, 0],
    [W / 2, 0],
    [W, 0],
    [0, H],
    [W / 2, H],
    [W, H],
  ];
}

/** Screen-reader description: a diagram is useless without one. */
function describe(setup: DrillSetup, title: string) {
  const parts = (setup.balls ?? []).map((ball) => {
    const across = ball.y < 0.34 ? "top" : ball.y > 0.66 ? "bottom" : "middle";
    const along =
      ball.x < 0.34 ? "baulk end" : ball.x > 0.66 ? "far end" : "centre of the table";
    return `${ball.role === "cue" ? "cue ball" : ball.role === "blocker" ? "blocking ball" : "object ball"} ${across} ${along}`;
  });
  return `Table setup for ${title}: ${parts.join("; ") || "no balls specified"}.`;
}
