import type { Metadata } from "next";
import Link from "next/link";
import { InformationSection, PublicInformationPage } from "@/components/vela/public-information-page";
import { publicContact } from "@/lib/public-contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Where to report a scientific correction, account issue, accessibility barrier, privacy request, or site problem.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const contact = publicContact();
  return (
    <PublicInformationPage current="/contact" eyebrow="Contact" title="Start with the route that owns the problem." description="A scientific correction, account issue, and site-security report need different context. Use the closest path below and never send passwords, session tokens, private keys, authorization codes, or repository secrets.">
      {!contact.configured ? (
        <div role="status" className="rounded-lg border border-status-caution/40 bg-status-caution/10 p-4 text-body leading-6">
          <strong className="text-foreground">Private support is not configured for this release.</strong>
          <p className="mt-1 text-muted-foreground">Do not post account data, private repository names, session information, or security details publicly. Account, privacy, accessibility, and security requests require a monitored private channel before release.</p>
        </div>
      ) : null}

      <InformationSection title="Correct scientific information">
        <p>Open the exact <Link href="/problems">Problem</Link>, source, or Contribution first. Its collection, source revision, and technical details identify what needs correction. A correction does not silently rewrite signed history; the relevant source or Repository records the change.</p>
      </InformationSection>

      <InformationSection title="Add scientific work">
        <p>Use <Link href="/contribute">Add a contribution</Link> to choose a Problem, check prior work, attach evidence, and prepare a Repository handoff. This is also the route for importing a selected GitHub repository.</p>
      </InformationSection>

      <InformationSection title="Account or connected code">
        <p>Signed-in users can inspect their account and current session at <Link href="/account">Account</Link>, and manage GitHub installations or connected repositories at <Link href="/account/connections">Connections</Link>.</p>
      </InformationSection>

      <InformationSection title="Privacy, accessibility, security, or a site bug">
        {contact.configured ? (
          <p>Email <a href={contact.href}>{contact.email}</a>. Include the page address, what you expected, and what happened. For a security report, provide only the minimum safe reproduction detail in the first message.</p>
        ) : (
          <p>A verified private contact address has not been published for this release. Private support must be configured before public launch.</p>
        )}
      </InformationSection>
    </PublicInformationPage>
  );
}
