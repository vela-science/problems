/*
  The projection the editorial site reads must have been produced by a Vela
  release the site can vouch for.

  This assertion used to live at module scope in
  apps/www/src/data/substrate-state.ts, as a hand-maintained Set of literal
  version strings that threw on any miss. Because every route imports that
  module through the footer, a skew took the whole site down — including seven
  routes whose only interest in it was a release string from a local JSON file.

  The check belongs here instead: a release gate, run by `bun run check`, which
  fails the build loudly while leaving the pages able to render and label what
  they actually have. Compatibility is a range, so no per-release editing.
*/

const MINIMUM = "0.914.0";

function parse(value) {
  const [core, pre = ""] = String(value).replace(/^vela\s+/u, "").split("-", 2);
  return { parts: core.split(".").map((part) => Number.parseInt(part, 10) || 0), pre };
}

function compare(a, b) {
  for (let index = 0; index < 3; index += 1) {
    const diff = (a.parts[index] ?? 0) - (b.parts[index] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  return a.pre < b.pre ? -1 : 1;
}

export function inspectProjectionCompatibility(projectionVersion, releaseVersion, minimum = MINIMUM) {
  const projection = parse(projectionVersion);
  const expected = parse(releaseVersion);
  const floor = parse(minimum);
  const belowFloor = compare(projection, floor) < 0;
  const aheadOfRelease = compare(projection, expected) > 0;
  return {
    schema: "vela.projection-compatibility.v1",
    projection: String(projectionVersion),
    expected: `vela ${releaseVersion}`,
    minimum: `vela ${minimum}`,
    compatible: !belowFloor && !aheadOfRelease,
    belowFloor,
    aheadOfRelease,
  };
}

export function assertProjectionCompatibility(projectionVersion, releaseVersion, minimum = MINIMUM) {
  const report = inspectProjectionCompatibility(projectionVersion, releaseVersion, minimum);
  if (!report.compatible) {
    const why = report.belowFloor
      ? `it predates the minimum supported ${report.minimum}`
      : `it is ahead of the expected ${report.expected}`;
    throw new Error(
      `editorial projection reports ${report.projection}; ${why}. `
        + "Refresh the projection, or raise the minimum if this release genuinely supports it.",
    );
  }
  return { ...report, ok: true };
}
