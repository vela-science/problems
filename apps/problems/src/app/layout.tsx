import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { SiteHeader } from "@/components/site-header";
import { authEnabled, currentHostedAccount } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://problems.science"),
  title: { default: "Vela Problems", template: "%s · Vela Problems" },
  description: "Read exact scientific state and coordinate work without confusing activity with accepted results.",
  icons: { icon: "/favicon.svg" },
};

const themeScript = `(() => { try { const stored = localStorage.getItem("vela-theme"); const dark = stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.dataset.theme = dark ? "dark" : "light"; document.documentElement.classList.toggle("dark", dark); } catch { document.documentElement.dataset.theme = "light"; } })();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account = await currentHostedAccount();
  return <html lang="en" data-theme="light" className={GeistSans.variable} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body suppressHydrationWarning>
      <a href="#main-content" className="sr-only z-50 bg-background px-4 py-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to problem</a>
      <SiteHeader account={account} authAvailable={authEnabled()} />
      <main id="main-content">{children}</main>
      <footer className="border-t px-4 py-6 text-center text-meta text-muted-foreground">
        Work is coordination. Scientific Standing changes only through an explicit repository Decision.
      </footer>
    </body>
  </html>;
}
