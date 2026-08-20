import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vela/ui/components/table";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import type { SweepFamily, SweptProposal } from "@/lib/claim-shape";

/* The bounded searches a Repository has actually banked, on the integer line.
 *
 * Thirteen Proposals on the Erdős Repository are thirteen unrelated rows in a
 * ledger. Seven of them are one contiguous sweep over adjacent 200-integer
 * windows, and one window was proposed twice. That is structure a mathematician
 * reads in a second and cannot recover from a date-ordered list at all.
 *
 * One quantitative channel and no more: a rect's horizontal extent IS the
 * integers that Proposal swept. Nothing else is proportional to anything, so
 * there is nothing on the canvas to misread. Standing rides on geometry —
 * a seam for the rejection, a dash where no authority ruled — because colour
 * alone does not survive forced colours or print.
 *
 * The axis has no right-hand cap. The sweep stops where the record stops;
 * drawing an end there would assert a boundary the data does not have.
 *
 * The parameter table below is rendered, not hidden. It is the figure's text
 * equivalent and it is also the mathematics: multiplicity, argmax and residue
 * are the result, and the interval is only where it was found. Each row carries
 * the assertion it was read out of, so the mark and its source are one glance
 * apart. */

const VIEW_WIDTH = 960;
const PAD_LEFT = 8;
/* Room for the axis to run past the last window without terminating. */
const PAD_RIGHT = 72;
const LANE_HEIGHT = 34;
const RECT_HEIGHT = 14;
const AXIS_HEIGHT = 26;

function packLanes(windows: SweptProposal[]): SweptProposal[][] {
  const lanes: SweptProposal[][] = [];
  for (const window of windows) {
    /* Windows arrive ordered by `lo`, so the last entry of a lane is the only
       one that can collide. A lane is added only where two Proposals cover
       overlapping integers, which today happens exactly once — and collapsing
       that pair would hide the rejection. */
    const lane = lanes.find((entries) => entries[entries.length - 1]!.hi < window.lo);
    if (lane) lane.push(window);
    else lanes.push([window]);
  }
  return lanes;
}

export function ProposalSweep({
  slug,
  family,
}: {
  slug: string;
  family: SweepFamily;
}) {
  const { windows, partial } = family;
  const lanes = packLanes(windows);
  const min = windows.length ? Math.min(...windows.map((window) => window.lo)) : 0;
  const max = windows.length ? Math.max(...windows.map((window) => window.hi)) : 0;
  const span = max - min;
  const plotted = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const x = (value: number) => PAD_LEFT + (span ? ((value - min) / span) * plotted : 0);
  const height = lanes.length * LANE_HEIGHT + AXIS_HEIGHT;
  const axisY = lanes.length * LANE_HEIGHT;
  const drawable = windows.length >= 3;

  return (
    <figure className="min-w-0">
      {drawable ? (
        <svg
          aria-hidden
          className="hidden h-auto w-full sm:block"
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          preserveAspectRatio="xMidYMin meet"
        >
          {lanes.map((lane, laneIndex) => (
            <g key={laneIndex} transform={`translate(0 ${laneIndex * LANE_HEIGHT})`}>
              {lane.map((window) => {
                const left = x(window.lo);
                const width = Math.max(1, x(window.hi) - left);
                const rejected = window.status === "rejected";
                const ruled = window.status === "accepted" || rejected;
                return (
                  <g
                    key={window.proposal_id}
                    className={rejected ? "text-status-conflict" : window.status === "accepted" ? "text-status-progress" : "text-muted-foreground"}
                  >
                    <text
                      x={left}
                      y={10}
                      className="fill-current font-mono"
                      fontSize="10"
                      opacity="0.85"
                    >
                      {window.primes} primes
                    </text>
                    <rect
                      x={left}
                      y={16}
                      width={width}
                      height={RECT_HEIGHT}
                      fill={ruled ? "currentColor" : "none"}
                      fillOpacity={ruled ? 0.18 : undefined}
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeDasharray={ruled ? undefined : "3 2.5"}
                    />
                    {/* seam — an authority refused this Proposal */}
                    {rejected ? (
                      <line
                        x1={left}
                        y1={16 + RECT_HEIGHT}
                        x2={left + width}
                        y2={16}
                        stroke="currentColor"
                        strokeWidth="1.25"
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          ))}

          {/* the integer line, open on the right */}
          <line x1={PAD_LEFT} y1={axisY + 8} x2={VIEW_WIDTH} y2={axisY + 8} stroke="currentColor" strokeWidth="1" className="text-border" />
          <g className="text-muted-foreground">
            {[min, max].map((value) => (
              <g key={value}>
                <line x1={x(value)} y1={axisY + 4} x2={x(value)} y2={axisY + 12} stroke="currentColor" strokeWidth="1" />
                <text
                  x={x(value)}
                  y={axisY + 24}
                  textAnchor={value === min ? "start" : "end"}
                  className="fill-current font-mono"
                  fontSize="10"
                >
                  {value}
                </text>
              </g>
            ))}
          </g>
        </svg>
      ) : null}

      <SweepTable slug={slug} windows={windows} className={drawable ? "mt-4" : undefined} />

      <figcaption className="mt-3 max-w-[80ch] text-meta text-muted-foreground">
        {drawable ? (
          <>
            {windows.length} Proposals swept {min}..{max} in bounded windows. Each rect spans the
            integers one Proposal swept, so width is interval length and nothing else on the canvas
            is proportional to anything; a second lane appears only where two Proposals cover the
            same window.
          </>
        ) : (
          <>The retained assertions did not yield a shape to draw.</>
        )}
        {partial ? (
          <>
            {" "}
            {partial === 1 ? "One further Proposal states" : `${partial} further Proposals state`} a
            bounded search whose interval, count, multiplicity, argmax and residue could not all be
            read from the assertion, so {partial === 1 ? "it is" : "they are"} absent above rather
            than partly drawn.
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* Adaptation of Tailwind Plus Application UI v4
   `lists/tables/07-with-stacked-columns-on-mobile`: the `hidden md:table-cell`
   secondary columns and the narrow-width `dl` folded into the leading cell are
   the mechanics taken. Its `gray-*` ramp and indigo link colour are dropped for
   tokens. Recorded in docs/editorial-references.md.

   Five mono integers do not fit beside a badge below `md`, and a wrapped
   integer is a misread integer, so they fold into the leading cell rather than
   being shrunk into a scroller. */
function SweepTable({
  slug,
  windows,
  className,
}: {
  slug: string;
  windows: SweptProposal[];
  className?: string;
}) {
  if (!windows.length) return null;
  return (
    <Table className={`text-compact ${className ?? ""}`}>
      <caption className="sr-only">
        Every Proposal in the bounded sweep, with the parameters its assertion states.
      </caption>
      <TableHeader className="text-eyebrow text-muted-foreground">
        <TableRow>
          <TableHead className="py-2 pr-3 text-left font-normal">Window</TableHead>
          <TableHead className="hidden py-2 pr-3 text-right font-normal md:table-cell">Primes</TableHead>
          <TableHead className="hidden py-2 pr-3 text-right font-normal md:table-cell">Max multiplicity</TableHead>
          <TableHead className="hidden py-2 pr-3 text-right font-normal md:table-cell">Argmax p</TableHead>
          <TableHead className="hidden py-2 pr-3 text-right font-normal md:table-cell">Residue</TableHead>
          <TableHead className="py-2 pr-3 text-left font-normal">Proposal status</TableHead>
          <TableHead className="hidden py-2 text-left font-normal lg:table-cell">Assertion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {windows.map((window) => (
          <TableRow key={window.proposal_id} className="align-top">
            <TableCell className="py-2.5 pr-3">
              <Link
                className="font-mono text-micro tabular-nums underline-offset-2 hover:underline"
                href={`/repositories/${slug}/proposals/${encodeURIComponent(window.proposal_id)}`}
              >
                {window.lo}..{window.hi}
              </Link>
              <dl className="mt-1 space-y-0.5 font-mono text-micro tabular-nums text-muted-foreground md:hidden">
                <div className="flex gap-2"><dt>primes</dt><dd>{window.primes}</dd></div>
                <div className="flex gap-2"><dt>max multiplicity</dt><dd>{window.multiplicity}</dd></div>
                <div className="flex gap-2"><dt>argmax p</dt><dd>{window.argmax}</dd></div>
                <div className="flex gap-2"><dt>residue</dt><dd>{window.residue}</dd></div>
              </dl>
              <p className="mt-1 text-micro text-muted-foreground lg:hidden">{window.source}</p>
            </TableCell>
            <TableCell className="hidden py-2.5 pr-3 text-right font-mono text-micro tabular-nums md:table-cell">{window.primes}</TableCell>
            <TableCell className="hidden py-2.5 pr-3 text-right font-mono text-micro tabular-nums md:table-cell">{window.multiplicity}</TableCell>
            <TableCell className="hidden py-2.5 pr-3 text-right font-mono text-micro tabular-nums md:table-cell">{window.argmax}</TableCell>
            <TableCell className="hidden py-2.5 pr-3 text-right font-mono text-micro tabular-nums md:table-cell">{window.residue}</TableCell>
            <TableCell className="py-2.5 pr-3">
              <StatusBadge axis="proposal" state={window.status}>{window.status.replaceAll("_", " ")}</StatusBadge>
            </TableCell>
            <TableCell className="hidden py-2.5 text-micro text-muted-foreground lg:table-cell">{window.source}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
