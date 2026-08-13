import Link from "next/link";
import { Check, Lock } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "./ui";
import type { Drill, DrillProgress } from "@/lib/types";

/** One drill in a list: what it is, how hard, and where you stand on it. */
export function DrillCard({
  drill,
  progress,
  locked = false,
}: {
  drill: Drill;
  progress?: DrillProgress;
  locked?: boolean;
}) {
  const status = progress?.status ?? "not_started";
  const best = progress?.best_normalized_score ?? null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[16px] font-medium leading-snug text-ink">{drill.name}</h3>
          {drill.short_objective && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
              {drill.short_objective}
            </p>
          )}
        </div>
        <StatusBadge status={status} locked={locked} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
        <span>{drill.duration_minutes} min</span>
        <span aria-hidden>·</span>
        <span>{drill.is_required ? "Required" : "Optional"}</span>
        {best !== null && (
          <>
            <span aria-hidden>·</span>
            <span className="text-accent-ink">Best {Math.round(best)}%</span>
          </>
        )}
      </div>
    </>
  );

  if (locked) {
    return (
      <div className="rounded-[14px] border border-line bg-canvas p-5 opacity-60">{body}</div>
    );
  }

  return (
    <Link
      href={`/drill/${drill.id}`}
      className="block rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-accent"
    >
      {body}
    </Link>
  );
}

function StatusBadge({
  status,
  locked,
}: {
  status: "not_started" | "in_progress" | "passed";
  locked: boolean;
}) {
  if (locked) {
    return (
      <Badge>
        <Lock size={11} className="mr-1" />
        Locked
      </Badge>
    );
  }
  if (status === "passed") {
    return (
      <Badge tone="good">
        <Check size={11} weight="bold" className="mr-1" />
        Passed
      </Badge>
    );
  }
  if (status === "in_progress") return <Badge tone="accent">In progress</Badge>;
  return <Badge>Not started</Badge>;
}
