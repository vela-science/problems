# Problem 94 restored Option-1 design QA

> **Historical, 2026-08-27.** This records the rollback to the Option-1 layout
> as it stood that day. The platform redesign that followed replaced every
> surface described below — there is no longer an answer card, a right evidence
> rail, or a framed question. Kept unedited as the record of a decision that
> was current when it was written.

## Outcome

The sparse redesign was fully rolled back. Problem 94 again uses the previously approved Option-1 implementation: framed retained question, structured answer card, visible update and rights blocks, and the complete right evidence rail.

No additional redesign was performed during the rollback.

## Visual verification

- Desktop, 1536 × 1024: `/Users/williamblair/Documents/Codex/2026-08-27/problems-science-world-class/outputs/problem-94-restored-option-1-desktop.png`
- Mobile, 390 × 844: `/Users/williamblair/Documents/Codex/2026-08-27/problems-science-world-class/outputs/problem-94-restored-option-1-mobile.png`
- Desktop horizontal overflow: none.
- Mobile horizontal overflow: none.
- Mobile evidence rail stacks below the main column.
- Desktop and mobile console errors/warnings: none.

## Restored structure

- Question card with source attribution.
- Answer card with `What we know`, accepted partial-result receipt, `What remains open`, and three focused actions.
- Right sidebar with `Current state`, `Evidence checks`, `How we got here`, and progressively disclosed `Record details`.
- Visible `Latest meaningful update` and `Sources and rights` blocks.
- Technical roots and explicit missing data remain behind disclosures.

## Verification

- Focused tests: 3 passed, 17 assertions.
- Problems typecheck: passed.
- Problems lint: passed with zero warnings.

final result: restored and passed
