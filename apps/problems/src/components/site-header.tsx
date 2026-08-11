import Link from "next/link";
import Image from "next/image";
import mark from "@vela/brand/mark-micro.svg";
import { Button } from "@vela/ui/components/button";
import type { HostedAccount } from "@/lib/auth";
import { signOutAccount } from "@/app/actions/auth";

export function SiteHeader({ account, authAvailable }: { account: HostedAccount | null; authAvailable: boolean }) {
  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
    <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 sm:px-6">
      <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold tracking-tight">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center dark:rounded-[6px] dark:border dark:bg-[var(--vela-color-light)]">
          <Image src={mark} alt="" width={22} height={22} priority unoptimized />
        </span>
        <span>Vela</span>
      </Link>
      <nav aria-label="Primary" className="flex items-center text-meta">
        <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/" />}>Problems</Button>
      </nav>
      <nav aria-label="Utilities" className="ml-auto flex items-center gap-1 text-meta">
        <Button nativeButton={false} variant="ghost" size="sm" render={<a href="https://www.vela.space" />}>About</Button>
        <Button nativeButton={false} variant="ghost" size="sm" className="hidden sm:inline-flex" render={<a href="https://app.vela.space/repositories" />}>Records</Button>
        {account ? <>
          <span className="hidden max-w-40 truncate text-muted-foreground md:inline">{account.displayName}</span>
          <form action={signOutAccount}><Button variant="outline" size="sm" type="submit">Sign out</Button></form>
        </> : authAvailable ? <Button nativeButton={false} size="sm" render={<Link href="/sign-in" prefetch={false} />}>Sign in</Button> : null}
      </nav>
    </div>
  </header>;
}
