import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cloneElement, isValidElement } from "react"

import { cn } from "#lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          /* `border-input`, not `border-border`. An outline button's edge is the
           only thing that says where the control is, so WCAG 1.4.11 asks 3:1 of
           it. `--border` is the divider token and measures 1.36:1 on the light
           page — it was already `--input` in dark, which is the token that
           exists for exactly this and measures 3.33:1 light. Rules and dividers
           keep `--border`; controls state their own boundary. */
          "border-input bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/* A link stays a link, however it is styled.
 *
 * `nativeButton={false}` tells Base UI the rendered element is not a native
 * button, so it supplies `role="button"` and `tabindex="0"`. That is right for
 * a `<span>` acting as a button. It is wrong for an anchor: the anchor keeps
 * link activation, where Enter follows the href and Space scrolls the page. A
 * screen reader announced "button" and then Space did nothing — the promised
 * behaviour and the real behaviour disagreed (WCAG 4.1.2). It also hid the one
 * fact worth knowing about "Upstream source", which leaves the site.
 *
 * Eighty-seven call sites pass a `<Link>` or `<a>` here, so the fix belongs at
 * the primitive rather than at each of them. When the render target carries an
 * `href`, apply the styling and leave its own semantics alone. Everything else
 * goes through Base UI unchanged.
 *
 * This is a hand edit to a shadcn-installed primitive: reapply it if
 * `base-nova` ever reinstalls this file. */
type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }))
  const { render, nativeButton, ...rest } = props
  const linkRender =
    nativeButton === false &&
    isValidElement<{ href?: unknown; className?: string }>(render) &&
    render.props.href != null
      ? render
      : null

  if (linkRender) {
    return cloneElement(linkRender, {
      "data-slot": "button",
      className: cn(classes, linkRender.props.className),
      ...rest,
    } as Partial<typeof linkRender.props>)
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={classes}
      nativeButton={nativeButton}
      render={render}
      {...rest}
    />
  )
}

export { Button, buttonVariants }
