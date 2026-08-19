const retainedEvidencePath = /\bevidence\/(?:current|history)\/[^/\s]+\/[^\s,;]+/u;

/**
 * Keep internal custody filenames out of reader-facing scientific prose.
 * The immutable record still retains the exact string; this presentation says
 * what the condition establishes without making a historical working filename
 * look like the Result's current source repository or ref.
 */
export function resultConditionPresentation(condition: string): string {
  const value = condition.trim();
  return retainedEvidencePath.test(value)
    ? "An exact evidence file is bound to this Result; its recorded path remains in the technical record."
    : value;
}
