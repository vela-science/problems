import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@vela/ui/lib/utils";
import styles from "./editorial-plate.module.css";

export function EditorialPlate({
  image,
  caption,
  href,
  linkLabel,
  priority = false,
  className,
  imageClassName,
}: {
  image: StaticImageData;
  caption: string;
  href?: string;
  linkLabel?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <figure className={cn(styles.plate, className)}>
      <div className={styles.media} aria-hidden="true">
        <Image
          src={image}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 44vw, 38vw"
          className={cn(styles.image, imageClassName)}
        />
      </div>
      <figcaption className={styles.caption}>
        <span>{caption}</span>
        {href && linkLabel ? (
          <Link href={href} className={styles.captionLink}>
            {linkLabel} <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="inline size-3.5" />
          </Link>
        ) : null}
      </figcaption>
    </figure>
  );
}
