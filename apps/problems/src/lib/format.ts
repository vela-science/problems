const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatDate(value: string | null): string {
  return value ? dateTimeFormat.format(new Date(value)) : "not recorded";
}

/**
 * The host a Repository's remote is served from, for a surface that names it.
 *
 * Two surfaces printed this, each with its own copy of the try/catch. A remote
 * that is not a URL is shown verbatim rather than as an empty host: it is a
 * retained value, and blanking it would be an edit.
 */
export function remoteHost(remote: string): string {
  try {
    return new URL(remote).hostname;
  } catch {
    return remote;
  }
}

/**
 * A count with its noun, agreeing in number.
 *
 * Written three times, one of which separated thousands and two of which did
 * not, so the same count read differently on two surfaces. It separates: these
 * counts reach five figures on the Erdős ledger, and an unseparated one there
 * is harder to read than a separated one is anywhere.
 */
export function plural(count: number, noun: string): string {
  return `${count.toLocaleString("en-US")} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Splits a claim assertion into a short lead and the rest.
 *
 * The old fallback returned the claim id as the title, so any assertion without
 * an early colon rendered its 64-hex digest as the row heading — and then again
 * as the row's identifier, twice per row across thousands of rows. An assertion
 * always has words in it; lead with those. `fallback` is retained only for the
 * degenerate case of an empty assertion.
 */
export function claimTitle(assertion: string, fallback: string): { title: string; assertion: string } {
  const text = assertion.trim();
  if (!text) return { title: fallback, assertion: "" };
  const separator = text.indexOf(":");
  if (separator > 0 && separator <= 80) {
    return {
      title: text.slice(0, separator),
      assertion: text.slice(separator + 1).trim(),
    };
  }
  /* Break on the first sentence end that leaves a readable lead. */
  const sentence = text.search(/[.?!](?:\s|$)/u);
  if (sentence > 0 && sentence <= 120) {
    return { title: text.slice(0, sentence + 1), assertion: text.slice(sentence + 1).trim() };
  }
  /* No clean split: there is no lead to promote, so the row shows the assertion
     once rather than a truncated copy of itself above the full text. */
  return { title: "", assertion: text };
}

/** Elapsed time between two instants, for "decided 4h after it was opened". */
export function formatElapsed(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * The instant a `<time datetime>` attribute can actually take.
 *
 * The retained instants reach the surfaces as `Date.toString()` values
 * (`"Wed Aug 05 2026 14:30:06 GMT-0400 …"`), which `datetime` does not parse,
 * and as epoch milliseconds once a surface has sorted on them. Both name the
 * same instant; this returns it in the one form HTML defines, or nothing when
 * the value does not parse, so no surface emits an attribute it cannot honour.
 */
export function machineInstant(value: string | number): string | undefined {
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}


/**
 * How long ago, the way every catalogue a reader arrives from says it.
 *
 * Rows printed `Aug 6, 2026, 8:04 PM` — nineteen characters of absolute
 * timestamp on every row of a list sorted by recency, where the question is
 * almost always "how recent" and never "what minute". GitHub, Hugging Face and
 * entire.io all answer the first and keep the second one hover away, and a
 * reader coming from any of them reads `2d` without stopping.
 *
 * The exact instant is not lost: callers pair this with `machineInstant` on a
 * `<time>` element, so the absolute value stays in the DOM, in the tooltip, and
 * in anything that reads the page as data.
 */
export function formatAgo(value: string | null, now: number = Date.now()): string {
  if (!value) return "not recorded";
  const then = Date.parse(value);
  if (!Number.isFinite(then)) return "not recorded";
  const seconds = Math.round((now - then) / 1000);
  /* A clock skew of a few seconds is not the future, and "in 3 seconds" on a
     retained record would read as a defect in the record rather than in the
     clock. */
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
