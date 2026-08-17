import type { Metadata } from "next";
import Link from "next/link";
import { InformationList, InformationSection, PublicInformationPage } from "@/components/vela/public-information-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for browsing problems.science, connecting code, and preparing scientific contributions.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicInformationPage current="/terms" eyebrow="Terms" title="Use the service to inspect and contribute scientific work responsibly." description="These terms describe the current research product as of August 17, 2026. They do not replace the licenses, rights, or authority rules of a source collection or Repository.">
      <InformationSection title="Using problems.science">
        <p>You may browse public material, create an account, connect repositories you are authorized to access, and prepare scientific Contributions. Do not misuse the service, interfere with other users, evade access controls or request limits, upload unlawful material, or connect a repository without permission.</p>
      </InformationSection>

      <InformationSection title="Your material and connected repositories">
        <p>You keep the rights you already have in material you submit. You allow the service to process, display, and transmit that material only as needed to provide the features you request. You remain responsible for having the rights to share it.</p>
        <p>Source and repository licenses still control their own content. Connecting GitHub gives problems.science read access to the selected repositories; it does not transfer ownership or scientific authority.</p>
      </InformationSection>

      <InformationSection title="Contributions are not automatic acceptance">
        <InformationList>
          <li>A hosted draft is unsigned and does not change scientific state.</li>
          <li>A check or review records scoped evidence; it does not accept a Contribution.</li>
          <li>Only the relevant Repository can record its local Decision and current state.</li>
          <li>A signed record proves attribution and integrity, not scientific truth.</li>
        </InformationList>
      </InformationSection>

      <InformationSection title="Availability and research use">
        <p>The service and its scientific material are provided without a promise that every status is complete, current, error-free, or suitable for a particular purpose. Nothing on the site is medical, legal, financial, or other professional advice. Verify important claims against the named sources and preserve your own copies of work.</p>
        <p>Features may change, pause, or be withdrawn. Reasonable steps may be taken to protect the service, its users, and connected systems. Applicable rights that cannot lawfully be excluded remain unaffected.</p>
      </InformationSection>

      <InformationSection title="Questions and changes">
        <p>Material changes will be reflected on this page with a new date. For account, privacy, accessibility, or service questions, use <Link href="/contact">Contact</Link>.</p>
      </InformationSection>
    </PublicInformationPage>
  );
}
