/* "Erdős problem 2", "Problem 2" — the name a Problem gets when no statement
   was retained for it. Rendered in the Question column it reads as a question,
   and 1,217 rows deep a reader learns to skim past real ones expecting the
   same. */
export function isJustTheName(label: string, number: string) {
  const normalized = label.trim().toLowerCase().replace(/\s+/gu, " ");
  return normalized === `problem ${number}`
    || normalized === `erdős problem ${number}`
    || normalized === `erdos problem ${number}`;
}
