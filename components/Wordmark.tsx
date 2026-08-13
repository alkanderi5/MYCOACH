import { cx } from "./ui";

/**
 * The identity: the word plus its crimson dot. There is no logo mark — one was
 * explored and rejected — so this is the whole of it.
 */
export function Wordmark({
  size = "sm",
  className,
}: {
  /** `sm` is the in-app wordmark, `lg` the splash. */
  size?: "sm" | "lg";
  className?: string;
}) {
  const large = size === "lg";

  return (
    <span className={cx("inline-flex items-center", large ? "gap-[14px]" : "gap-[7px]", className)}>
      <span
        aria-hidden
        className="shrink-0 rounded-full"
        style={
          large
            ? {
                width: 20,
                height: 20,
                background: "var(--color-on-accent)",
                boxShadow: "0 0 26px rgba(255,255,255,.6)",
              }
            : {
                width: 9,
                height: 9,
                background: "var(--color-accent)",
                boxShadow: "0 0 9px rgba(229,18,63,.55)",
              }
        }
      />
      <span
        className={cx(
          "font-semibold",
          large ? "text-[44px] leading-none" : "text-[20px] leading-none",
        )}
        style={{
          letterSpacing: large ? "-0.04em" : "-0.03em",
          color: large ? "var(--color-on-accent)" : "var(--color-ink)",
        }}
      >
        Cuemaster
      </span>
    </span>
  );
}
