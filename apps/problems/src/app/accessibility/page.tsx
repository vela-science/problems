import type { Metadata } from "next";
import Link from "next/link";
import { InformationList, InformationSection, PublicInformationPage } from "@/components/vela/public-information-page";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "The accessibility approach, supported interaction modes, and known limitations of problems.science.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <PublicInformationPage current="/accessibility" eyebrow="Accessibility" title="Scientific work should be readable and operable in more than one way." description="problems.science aims to meet WCAG 2.2 Level AA. This is a target and an ongoing practice, not a claim that every page is already free of barriers.">
      <InformationSection title="What the interface supports">
        <InformationList>
          <li>Semantic landmarks, descriptive headings, skip navigation, visible focus, and keyboard-operable controls.</li>
          <li>Responsive layouts at 320 and 390 CSS pixels and reflow at 200% zoom.</li>
          <li>System reduced-motion and forced-colors preferences, high-contrast controls, and print-friendly reading views.</li>
          <li>Text or list alternatives for charts, relationship diagrams, timelines, and other data visualizations.</li>
          <li>Labels and state words that do not rely on color alone.</li>
        </InformationList>
      </InformationSection>

      <InformationSection title="Known limits">
        <p>Source-authored mathematical notation, very long exact identifiers, and linked external artifacts can carry accessibility limits inherited from their source. The relationship graph has a synchronized list view because its canvas is not the only usable representation. Some newly published or imported content may not yet have complete descriptions.</p>
        <p>The product is under active development, so undiscovered barriers are possible. No accessibility overlay replaces fixes in the underlying interface.</p>
      </InformationSection>

      <InformationSection title="Report a barrier">
        <p>Use <Link href="/contact">Contact</Link> and include the page address, what you were trying to do, your browser or assistive technology if relevant, and the format you need. Do not include passwords, session tokens, private repository names, or other secrets.</p>
        <p>You can read the target standard at <a href="https://www.w3.org/TR/WCAG22/">W3C Web Content Accessibility Guidelines 2.2</a>.</p>
      </InformationSection>
    </PublicInformationPage>
  );
}
