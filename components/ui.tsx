import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Shared primitives. Kept in one file because each is a few lines and they
 *  are always used together. */

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ── surfaces ─────────────────────────────────────────────────────────── */

export function Card({
  className,
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-[14px] border border-line bg-surface p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
      {children}
    </h2>
  );
}

/* ── buttons ──────────────────────────────────────────────────────────── */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium " +
  "transition-colors disabled:opacity-45 disabled:pointer-events-none";

const VARIANTS = {
  primary: "bg-accent text-canvas hover:bg-accent-ink",
  outline: "border border-line-strong text-ink hover:border-accent hover:text-accent",
  quiet: "text-muted hover:text-accent",
  danger: "border border-line-strong text-miss hover:border-miss",
} as const;

const SIZES = {
  lg: "h-14 px-6 text-[15px] tracking-[0.04em]",
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-[13px]",
} as const;

type ButtonLook = { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES };

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & ButtonLook) {
  return (
    <button
      className={cx(BUTTON_BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & ButtonLook) {
  return (
    <Link
      className={cx(BUTTON_BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    />
  );
}

/* ── progress ─────────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ── labels ───────────────────────────────────────────────────────────── */

const BADGE_TONES = {
  neutral: "border-line-strong text-muted",
  accent: "border-accent text-accent-ink",
  good: "border-made text-made",
  bad: "border-miss text-miss",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] tracking-[0.06em]",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ── states ───────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="text-[15px] text-ink">{title}</p>
      {children && <p className="mt-2 text-[13px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

/** Errors are announced, not just coloured — colour alone is not a signal. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-3 text-[13px] text-ink">
      <span aria-hidden className="mt-0.5 w-px self-stretch bg-miss" />
      {children}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-md bg-line", className)}
      aria-hidden
    />
  );
}
