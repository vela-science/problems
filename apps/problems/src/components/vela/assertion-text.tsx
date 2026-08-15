import { Fragment } from "react";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { RecordId } from "@/components/vela/record-id";

/* A record's own assertion, with its exact identifiers elided rather than set
 * as prose.
 *
 * The pilot Proposal's assertion carries two forty-character commits inside
 * one sentence. Rendered whole at heading weight, the sentence became a wall
 * and the two things a reader actually needs from it — what was proved, and
 * that it was proved somewhere exact — were equally hard to find. Eliding the
 * digests puts the sentence back and keeps the values one disclosure away, in
 * the accessibility tree and in selected text, which is what `RecordId`
 * already guarantees.
 *
 * The elision lives here rather than in `ScientificText` because that
 * component is registry-owned shared UI whose contract is KaTeX and LaTeX
 * accents. Which identifiers a Problems reader should see in full is a
 * reading rule of this application, not a property of scientific text.
 *
 * No value is derived from a matched digest and nothing is compared: this
 * parses for rendering, not for meaning. */

const DIGEST = /((?:sha256:)?\b[0-9a-f]{64}\b|\b[0-9a-f]{40}\b)/gu;

/* Whether a position sits inside a math span.
 *
 * A sixty-four character hex run is legal inside `$…$`, and carving one out
 * there would hand KaTeX two unbalanced fragments and lose the formula. Only
 * split where the number of unescaped `$` before the match is even, and
 * otherwise render the whole string as scientific text unchanged. */
function outsideMath(text: string, index: number): boolean {
  let dollars = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === "$" && text[cursor - 1] !== "\\") dollars += 1;
  }
  return dollars % 2 === 0;
}

export function AssertionText({ text }: { text: string }) {
  const matches = [...text.matchAll(DIGEST)];
  const splittable = matches.filter((match) => outsideMath(text, match.index ?? 0));
  if (!splittable.length) return <ScientificText text={text} />;

  const parts: Array<{ kind: "text" | "digest"; value: string }> = [];
  let cursor = 0;
  for (const match of splittable) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ kind: "text", value: text.slice(cursor, start) });
    parts.push({ kind: "digest", value: match[0] });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: "text", value: text.slice(cursor) });

  return <>
    {parts.map((part, index) => (
      <Fragment key={`${part.kind}:${index}`}>
        {part.kind === "digest"
          ? <RecordId value={part.value} prefix={12} copy={false} />
          : <ScientificText text={part.value} />}
      </Fragment>
    ))}
  </>;
}
