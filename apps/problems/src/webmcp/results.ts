/* Tool results.
 *
 * WebMCP hands the model whatever `execute` returns. The spec's shape is a
 * content array, so everything goes back as one text block holding compact
 * JSON: models read JSON reliably, and a fixed envelope means a tool cannot
 * accidentally return prose that reads like a conclusion.
 *
 * Two rules the rest of this module depends on:
 *
 *   - a failure is a returned result, not a thrown error. A thrown error tells
 *     the model the tool is broken; a returned `ok: false` with a `remedy`
 *     tells it what to do next, which is almost always what is actually true.
 *   - every mutating result states what it did NOT do. `prepare_submission`
 *     returning a draft id, with no further comment, would leave a reasonable
 *     model to assume Standing had moved. */

export type ToolResult = { content: Array<{ type: "text"; text: string }> };

/* Long enough for a claim's assertion and its conditions, short enough that a
   handful of tool calls do not crowd out the conversation. */
const MAX_RESULT_BYTES = 24_000;

function encode(value: unknown): string {
  const text = JSON.stringify(value, null, 1);
  if (text.length <= MAX_RESULT_BYTES) return text;
  return JSON.stringify({
    ok: false,
    error: "result_too_large",
    detail: `This result serialised to ${text.length} bytes, over the ${MAX_RESULT_BYTES} byte bound.`,
    remedy: "Ask for one record by id rather than the whole set.",
  }, null, 1);
}

export function ok(payload: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text: encode({ ok: true, ...payload }) }] };
}

/**
 * A failure the model can act on.
 *
 * `remedy` is required because a tool that only says "not found" invites a
 * retry with the same argument.
 */
export function failure(error: string, detail: string, remedy: string): ToolResult {
  return { content: [{ type: "text", text: encode({ ok: false, error, detail, remedy }) }] };
}

/** The sentence every mutating tool returns, in the same words each time. */
export const NON_AUTHORITATIVE = Object.freeze({
  authority_effect: "none",
  standing_changed: false,
  note: "This recorded hosted Work. It did not change any Claim's Standing, "
    + "issue a Decision, or sign anything. Scientific state changes only "
    + "through an authorised, attributed Decision in the Vela Repository.",
});
