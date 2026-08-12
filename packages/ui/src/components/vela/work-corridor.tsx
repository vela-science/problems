import {
  FileExportIcon,
  Package03Icon,
  Target01Icon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./work-corridor.module.css";

const steps = [
  { label: "Target", detail: "Bounded next step", icon: Target01Icon },
  { label: "Workspace", detail: "Private or team-local", icon: WorkIcon },
  { label: "Research Block", detail: "Rooted contribution", icon: Package03Icon },
  { label: "Unsigned handoff", detail: "Local authority remains local", icon: FileExportIcon },
] as const;

/** A semantic publication path, never a progress tracker. It deliberately has
 * no completion, timing, health, or approval state: those facts must come from
 * an exact data owner rather than from this orientation component. */
export function WorkCorridor() {
  return (
    <ol className={styles.corridor} data-slot="work-corridor" aria-label="Work publication corridor">
      {steps.map(({ label, detail, icon: Icon }, index) => (
        <li key={label} className={styles.step}>
          <span className={styles.index}>0{index + 1}</span>
          <HugeiconsIcon icon={Icon} aria-hidden className="size-4" />
          <span><strong className={styles.label}>{label}</strong><small className={styles.detail}>{detail}</small></span>
        </li>
      ))}
    </ol>
  );
}
