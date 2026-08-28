import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Script from "next/script";
import { allRepositories, compositeSearchRoot, formalConjecturesCollectionRoot, projectionManifest } from "@vela/projection-data";
import { AppShell } from "@/components/vela/app-shell";
import { authConfiguration } from "@/lib/auth";
import { publishedProblemCollections } from "@/lib/published-problem-collections";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://problems.science"),
  title: {
    default: "problems.science",
    template: "%s · problems.science",
  },
  description: "Find scientific problems, understand the current evidence, and contribute work.",
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

/* Runs before first paint, so a reader never sees the wrong ground flash to the
   right one. Unset means follow the system, not "light": the toggle offered
   Light and Dark only and defaulted to Light, so a visitor whose machine is in
   dark mode got the light Problems and had to go find the control. The two
   explicit choices still win over the system, which is the whole point of
   having them. */
export const themeScript = `(() => {
  try {
    const stored = localStorage.getItem("vela-theme");
    const dark = stored === "dark"
      || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset.contrast = localStorage.getItem("vela-contrast") === "high" ? "high" : "standard";
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.contrast = "standard";
    document.documentElement.classList.remove("dark");
  }
})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [repositories, manifest] = await Promise.all([
    allRepositories(),
    projectionManifest(),
  ]);
  const authEnabled = authConfiguration().enabled;
  const publishedRepositories = repositories.map((repository) => ({
    slug: repository.slug,
    name: repository.status.repository.name,
    pending: repository.status.counts.pending_review,
    hasGraph: Boolean(repository.graph),
  }));

  return (
    <html lang="en" data-theme="light" data-contrast="standard" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <Script id="vela-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only z-100 bg-background px-4 py-3 text-body focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <AppShell
          publishedRepositories={publishedRepositories}
          problemCollections={publishedProblemCollections}
          projectionRoot={manifest.release_root}
          searchRoot={compositeSearchRoot(manifest.release_root)}
          collectionRoot={formalConjecturesCollectionRoot}
          authEnabled={authEnabled}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
