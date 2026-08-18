import { stateAxesByWord, type StateAxis } from "@vela/ui/vela/status-badge";

/**
 * The reader-facing word for a projection kind.
 *
 * Protocol kinds remain exact in the projection and technical details. Product
 * lists translate only the kinds whose stored words do not describe the object
 * a reader is choosing: a Claim is a durable Result here, while a Proposal is a
 * proposed change.
 *
 * Both controllers that print a kind held their own copy of this mapping, so
 * the rename had two homes and could drift; that is why it still lives here
 * rather than at each call site.
 */
export function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    claim: "Result",
    proposal: "proposed change",
    verifier_attachment: "historical check attachment",
  };
  return labels[kind] ?? kind.replaceAll("_", " ");
}

/**
 * The axis a projected state word belongs to.
 *
 * `search_documents.standing` and `graph_nodes.standing` are each a single
 * column written from whichever axis the record came from: repository integrity
 * for a Repository row, Claim standing for a Claim, a Proposal status for a
 * Proposal, a Verification outcome for a verifier attachment. Splitting the
 * column would change every search-document root and force a re-projection
 * while already-published roots kept serving the old shape, so the axis is
 * recovered here instead — it is still in the row, in the kind.
 *
 * The protocol decides which axis a word sits on, not this file: vela
 * docs/TERMINOLOGY.md, "Lifecycle vocabularies", runs Claim standing as
 * unassessed, accepted, accepted_with_conditions, retracted, superseded,
 * corrected, and the Proposal axis as pending_review, accepted, rejected —
 * withdrawn beside them in the CLI. So `rejected` and `withdrawn` are Proposal
 * words and never standing, and a word carries its own axis wherever the
 * protocol names it on one axis only. `accepted` is the one word legal on two,
 * and the kind of the record it was written for decides. A word the protocol
 * does not name at all — `historical_reference` and the
 * projection's own `recorded` and `contested` — has no axis, and these surfaces
 * make no axis claim for it rather than inventing one. That last case is not
 * hypothetical: `recorded` sat under standing in the badge's map, and every
 * Artifact and Problem node in the projection carries it.
 *
 * The citation is to the protocol rather than to a line range in
 * apps/problems/DESIGN.md, which is where this used to point: the section it
 * named was rewritten out from under it, and nothing then decided the rule.
 */
const axisOrder: StateAxis[] = ["standing", "verification", "proposal", "integrity"];

const axisNames: Record<StateAxis, string> = {
  standing: "Local Standing",
  verification: "Check outcome",
  proposal: "Proposed change status",
  integrity: "Repository integrity",
};

/* Words legal on more than one axis, which the badge's map cannot express: it
 * carries one axis per word. `accepted` is the only one, and the badge's map
 * now says so too — the two comments used to disagree about `rejected` and
 * `withdrawn`, with nothing left in the repository to decide between them. */
const dualAxisStates: Record<string, StateAxis[]> = {
  accepted: ["standing", "proposal"],
};

/* Derived from the badge's own map rather than written a second time. The one
 * word that must not come through is `accepted`, which the badge files under
 * standing because it can only file it once; here it is dual and the row's kind
 * decides. Everything else is the badge's answer verbatim. */
const axisByState: Record<string, StateAxis> = Object.fromEntries(
  Object.entries(stateAxesByWord).filter(([state]) => !(state in dualAxisStates)),
);

const axisByKind: Record<string, StateAxis> = {
  claim: "standing",
  proposal: "proposal",
  repository: "integrity",
  verifier_attachment: "verification",
};

/** Every axis a state word is legal on, in the order the State table lists them. */
function stateAxes(state: string): StateAxis[] {
  const single = axisByState[state];
  if (single) return [single];
  return dualAxisStates[state] ?? [];
}

/** The one axis a row's state names, or null when the word names none. */
export function stateAxis(state: string, kind?: string): StateAxis | null {
  const axes = stateAxes(state);
  if (axes.length === 1) return axes[0];
  const fromKind = kind ? axisByKind[kind] : undefined;
  return fromKind && axes.includes(fromKind) ? fromKind : null;
}

/** A state word printed with the word for its axis, which never appears without it. */
export function stateLabel(state: string, axis: StateAxis | null): string {
  const word = state.replaceAll("_", " ");
  return axis ? `${axis} · ${word}` : word;
}

/**
 * Everything a badge needs to print a projected state honestly.
 *
 * Returned as props rather than as a component so the ledger and the search
 * list cannot end up with two copies of the same five lines, which is how the
 * kind vocabulary above came to have two homes.
 */
export function stateBadge(state: string, kind: string): { state: string; axis?: StateAxis; children: string } {
  const axis = stateAxis(state, kind);
  return { state, axis: axis ?? undefined, children: stateLabel(state, axis) };
}

/**
 * Filter options grouped under the axis each word belongs to.
 *
 * One control over one column cannot be named for an axis, because the values
 * in it come from four. Naming the control `State` and heading its groups with
 * the axis names is what keeps a selected value from reading as a narrowing of
 * Claim standing.
 */
export function stateOptionGroups(values: readonly string[]): { label: string; values: string[] }[] {
  const groups = new Map<string, { label: string; values: string[]; rank: number }>();
  for (const value of [...new Set(values)].sort()) {
    const axes = stateAxes(value);
    const key = axes.join("|") || "none";
    const existing = groups.get(key);
    if (existing) {
      existing.values.push(value);
      continue;
    }
    groups.set(key, {
      label: axes.length ? axes.map((axis) => axisNames[axis]).join(" or ") : "Outside the state axes",
      values: [value],
      rank: axes.length ? axisOrder.indexOf(axes[0]) * 2 + (axes.length > 1 ? 1 : 0) : axisOrder.length * 2,
    });
  }
  return [...groups.values()].sort((a, b) => a.rank - b.rank).map(({ label, values: members }) => ({ label, values: members }));
}

/* What a record is called when something has to name it in one line.
 *
 * Used by search results and by every record route's `generateMetadata`, so a
 * result heading and the browser tab title for the same record agree. They did
 * not: search headed each result with `record.id` and the Claim route set
 * `title: claim.id`, which made a tab, a bookmark, a shared link and a search
 * result all read as 76 characters of hexadecimal.
 *
 * One rule, no per-kind table, because a per-kind table would be wrong for two
 * of them. `source_title` looks like the answer and is not: it holds an internal
 * source key (`erdos_deep:1125`) on 1,217 of 2,844 Claims and the containing
 * Repository's name on every row, so heading by it would give every
 * Claim the same name. The assertion is the record's own text on every kind
 * that has one.
 *
 * Artifacts and the two reference kinds have no text — their assertion is the
 * bare digest that is also their identity — so they fall through to the id,
 * which is genuinely all there is to show. */
const bareDigest = /^[0-9a-f]{64}$/u;

export function recordHeading(
  record: { id: string; assertion?: string | null },
): string | null {
  const text = record.assertion?.trim() ?? "";
  if (!text || text === record.id || bareDigest.test(text)) return null;
  return text;
}

/* A tab title is not a paragraph. A Claim's assertion runs to several sentences
 * and a browser shows perhaps forty characters of it, so cut at the first
 * sentence boundary and fall back to a hard cap when there is not one. */
export function recordTitle(record: { id: string; assertion?: string | null }): string {
  const heading = recordHeading(record);
  if (!heading) return record.id;
  const sentence = /^(.{20,110}?[.?!])\s/u.exec(heading)?.[1];
  if (sentence) return sentence;
  return heading.length > 110 ? `${heading.slice(0, 109).trimEnd()}…` : heading;
}
