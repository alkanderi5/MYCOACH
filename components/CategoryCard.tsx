import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { TableDiagram } from "./TableDiagram";
import { categoryColor, type Category, type Drill } from "@/lib/types";

/**
 * A category as a coloured card carrying a real table setup.
 *
 * The diagram is a drill that actually lives in this category at this level, so
 * the card previews the work rather than decorating itself with a stock shape.
 */
export function CategoryCard({
  category,
  href,
  done,
  total,
  sample,
  locked = false,
}: {
  category: Category;
  href: string;
  done: number;
  total: number;
  /** A drill from this category, used for the preview diagram. */
  sample?: Drill;
  locked?: boolean;
}) {
  const colour = categoryColor(category);

  const body = (
    <>
      {/* The colour reads as a wash over the ground rather than a flat fill,
          so white text stays comfortable on every hue. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colour} 0%, ${colour}cc 42%, ${colour}33 100%)`,
        }}
      />

      {sample?.setup?.balls?.length ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 top-1/2 w-[52%] -translate-y-1/2 opacity-45 mix-blend-luminosity"
        >
          <TableDiagram setup={sample.setup} title="" decorative />
        </span>
      ) : null}

      <span className="relative block">
        <span className="block text-[20px] font-semibold tracking-tight text-white">
          {category.name}
        </span>
        <span className="mt-1.5 block max-w-[62%] text-[12px] leading-snug text-white/75">
          {category.description ?? `${total} drill${total === 1 ? "" : "s"} at this level`}
        </span>

        <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-white">
          {locked ? "Locked" : done === total && total > 0 ? "All passed" : "Learn more"}
          {!locked && <CaretRight size={13} weight="bold" />}
        </span>

        <span className="mt-4 block text-[11px] text-white/70">
          {done} of {total} passed
        </span>
        <span
          aria-hidden
          className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-black/25"
        >
          <span
            className="block h-full rounded-full bg-white/90"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </span>
      </span>
    </>
  );

  const shell =
    "relative block overflow-hidden rounded-[14px] p-5 transition-transform";

  if (locked) {
    return <div className={`${shell} opacity-55`}>{body}</div>;
  }

  return (
    <Link href={href} className={`${shell} hover:-translate-y-0.5`}>
      {body}
    </Link>
  );
}
