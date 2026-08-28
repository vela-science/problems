import { BrandMark } from "@vela/ui/vela/brand-mark";

/* How far this Problem's record has travelled, and where it stops.
 *
 * Overview drew this fact twice, in two shapes, on two branches. A Problem with
 * nothing accepted got a vertical ladder of five stage marks; a Problem with an
 * accepted Result got a nested-box containment figure whose own caption said
 * "does not reach it". Same axis, same five facts, two instruments — and a
 * reader moving between two Problems saw the product change its mind about how
 * distance is drawn.
 *
 * One track. Each segment is coloured by whether its own stage is retained, so
 * a gap in the middle stays visible as a grey segment between two lit ones —
 * the record is not monotone and a single fill bar would have flattened that.
 * The terminal node is the question itself, drawn as a dashed open ring: an
 * open Problem is precisely one whose endpoint has not been reached, so it is
 * never filled here. That is the whole product in one mark.
 *
 * The sail rides the furthest reached node. It is the identity mark used as a
 * position, not as a status — `StateGlyph` owns status, and it encodes two
 * orthogonal axes (ring = standing, core = verification) that a single filled
 * or hollow silhouette cannot carry. Putting the sail on the track says how far
 * Vela's record has got without pretending to say what was decided.
 *
 * Every stage prints its own label and detail as ordinary text, so the colour
 * and the geometry are reinforcement rather than the sole channel (WCAG 1.4.1).
 */

export type ReachStop = {
  label: string;
  /** Whether the record retains this stage. Not necessarily monotone. */
  reached: boolean;
  detail: string;
};

const dot = "absolute left-0 top-1 size-3 rounded-full border-2 @lg/reach:top-0";
const segment = "absolute left-[0.3125rem] top-4 bottom-0 w-0.5 @lg/reach:inset-auto @lg/reach:left-3 @lg/reach:right-0 @lg/reach:top-[0.3125rem] @lg/reach:h-0.5 @lg/reach:w-auto";

export function Reach({ stops, endpoint, caption }: {
  stops: readonly ReachStop[];
  endpoint: string;
  caption: string;
}) {
  const furthest = stops.reduce((last, stop, index) => (stop.reached ? index : last), -1);
  /* A segment is the stretch between two nodes, so it is travelled only when
     both of its ends are. Colouring it by its own stage alone lit the final
     stretch — Decision to the question — on every answered Problem, drawing a
     line into a node the page says was never reached. The terminal is never
     reached, so this track always ends grey, which is the product's whole
     claim about an open Problem. */
  const travelled = (index: number) => stops[index].reached && Boolean(stops[index + 1]?.reached);
  return (
    <figure className="@container/reach m-0">
      <ol
        className="grid gap-0 @lg/reach:grid-cols-[repeat(var(--reach-stops),minmax(0,1fr))_auto]"
        style={{ "--reach-stops": stops.length } as React.CSSProperties}
      >
        {stops.map((stop, index) => (
          <li key={stop.label} className="relative min-w-0 pb-4 pl-6 @lg/reach:pt-5 @lg/reach:pr-4 @lg/reach:pb-0 @lg/reach:pl-0">
            <span aria-hidden className={`${segment} ${travelled(index) ? "bg-primary" : "bg-border"}`} />
            {index === furthest
              ? <BrandMark
                  profile="micro"
                  size={16}
                  className="absolute -left-1 top-0.5 text-primary @lg/reach:-top-1"
                  style={{ "--vela-mark-accent": "var(--muted-foreground)" } as React.CSSProperties}
                />
              : <span aria-hidden className={`${dot} ${stop.reached ? "border-primary bg-primary" : "border-border bg-card"}`} />}
            <span className="block truncate text-micro font-medium text-foreground">{stop.label}</span>
            <span className="block truncate text-micro text-muted-foreground">{stop.detail}</span>
          </li>
        ))}
        <li className="relative min-w-0 pl-6 @lg/reach:pt-5 @lg/reach:pl-0 @lg/reach:text-right">
          {/* Dashed and open. A filled endpoint would say the question is
              settled, which is the one thing an open Problem is not. */}
          <span aria-hidden className={`${dot} border-dashed border-muted-foreground bg-card @lg/reach:left-auto @lg/reach:right-0`} />
          <span className="block text-micro font-medium text-muted-foreground">{endpoint}</span>
          <span className="block text-micro text-muted-foreground">Not reached</span>
        </li>
      </ol>
      <figcaption className="mt-3 text-compact text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
