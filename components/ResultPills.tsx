/** The last few results as pass/fail pills, newest last. */
export function ResultPills({
  results,
  max = 5,
}: {
  results: { passed: boolean }[];
  max?: number;
}) {
  const recent = results.slice(0, max).reverse();
  if (recent.length === 0) return null;

  return (
    <span className="inline-flex gap-1.5">
      {recent.map((result, index) => (
        <span
          key={index}
          className="grid h-6 w-6 place-items-center rounded-md text-[11px] font-semibold text-white"
          style={{
            background: result.passed ? "var(--color-made)" : "var(--color-miss)",
          }}
          title={result.passed ? "Target met" : "Below target"}
        >
          {/* The letter carries the meaning, so the colour is never alone. */}
          {result.passed ? "P" : "M"}
        </span>
      ))}
    </span>
  );
}
