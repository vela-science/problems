import { ArrowRight01Icon, Key01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./account-planes.module.css";

/* What this account is, said once.
 *
 * It was said eleven times. Eight distinct sentences across five files —
 * "Connections never grant scientific authority", "They do not establish
 * authorship or truth", "It does not confer authorship, review independence,
 * or Repository authority", and five more — each a disclaimer under a heading,
 * none of them describing what the two planes actually hold. A reader who
 * opened Account, then Connections, then Public profile read the same negation
 * in different words on every screen and still could not say what a Repository
 * does that their account does not.
 *
 * AGENTS.md forbids exactly this shape: a route satisfied by disclaimer
 * paragraphs, and a fact restated where the second telling changes nothing.
 *
 * So the boundary is drawn instead of asserted. Two planes, what each holds,
 * and the one crossing between them — an unsigned draft the user signs locally
 * with a key this product never has. The asymmetry is the point and it is
 * visible: one side has a key, the other has none, and the arrow runs one way. */
const HOSTED = ["Sign-in and session", "Workspaces, notes, and drafts", "Connected codebases", "Public contributor profile"];
const REPOSITORY = ["Claims", "Verification", "Decisions", "Standing"];

export function AccountPlanes() {
  return <section aria-labelledby="account-planes-heading" className={styles.panel}>
    <div className={styles.head}>
      <h2 id="account-planes-heading" className={styles.kicker}>Where your work lives</h2>
    </div>
    <div className={styles.figure}>
      <div className={styles.plane}>
        <p className={styles.planeName}>This account</p>
        <ul className={styles.list}>
          {HOSTED.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className={styles.foot}>Holds no signing key.</p>
      </div>

      {/* The crossing is the whole claim: work leaves as a draft, and it is
          signed on the reader's own machine. Hosted code cannot sign. */}
      <div className={styles.crossing}>
        <span aria-hidden className={styles.arrowRow}>
          <span className={styles.arrowWrap}>
            <HugeiconsIcon icon={ArrowRight01Icon} className={styles.arrow} />
          </span>
        </span>
        <p className={styles.crossingLabel}>An unsigned Submission, signed locally with your own key</p>
      </div>

      <div className={`${styles.plane} ${styles.planeAuthority}`}>
        <p className={styles.planeName}>
          A Vela Repository
          <span className={styles.key}><HugeiconsIcon icon={Key01Icon} aria-hidden className={styles.keyIcon} />holds the authority key</span>
        </p>
        <ul className={styles.list}>
          {REPOSITORY.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className={styles.foot}>Every Decision is made here.</p>
      </div>
    </div>
  </section>;
}
