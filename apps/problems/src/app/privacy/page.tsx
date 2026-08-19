import type { Metadata } from "next";
import Link from "next/link";
import { InformationList, InformationSection, PublicInformationPage } from "@/components/vela/public-information-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What information problems.science handles when you browse, sign in, connect GitHub, or save work.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicInformationPage current="/privacy" eyebrow="Privacy" title="Your account and scientific work are separate." description="This notice describes the current problems.science product as of August 19, 2026. Public scientific material comes from its named sources; private account and workspace data support the actions you choose to take.">
      <InformationSection title="Information handled when you use the site">
        <InformationList>
          <li><strong>Public browsing:</strong> ordinary request information needed to deliver and protect the service. Theme and contrast choices are stored in your browser.</li>
          <li><strong>Account:</strong> WorkOS provides sign-in. The product receives an account identifier, display name, email address, and session information needed to keep you signed in.</li>
          <li><strong>Public profile:</strong> only if you create one, the product keeps the handle, display name, bio, affiliation, declared links, and visibility you choose. The default visibility is private; email and WorkOS identifiers are never profile fields.</li>
          <li><strong>Private work:</strong> followed Problems, workspaces, approaches, attempts, discussions, assignments, artifact metadata, import state, and unsigned Contribution drafts you choose to save.</li>
          <li><strong>GitHub connections:</strong> selected installation and repository identifiers, repository metadata, exact revisions, inspection results, and delivery receipts. The GitHub App requests read-only contents and metadata access for repositories you select.</li>
          <li><strong>Pilot telemetry:</strong> only from a Vela Workbench install whose user opted in, the product receives content-free product signals: a stage name from a closed list, a timestamp, a random install identifier created at opt-in, and an elapsed stage duration. It never receives scientific contents, repository files, prompts, credentials, or signatures, is never joined to an account, and each entry is deleted after 90 days.</li>
        </InformationList>
      </InformationSection>

      <InformationSection title="What the product does not do">
        <InformationList>
          <li>It does not use your WorkOS login as a scientific identity or grant it Repository authority.</li>
          <li>It does not store a Repository authority key or sign scientific records for you.</li>
          <li>It does not store large artifact bytes in the hosted activity database; those remain in repositories or external stores.</li>
          <li>The current application does not include advertising or third-party product-analytics SDKs.</li>
        </InformationList>
      </InformationSection>

      <InformationSection title="Service providers and source systems">
        <p>WorkOS handles authentication. GitHub handles repositories you choose to connect. Vercel hosts the application, and Neon hosts its databases. Those providers process information under their own terms and privacy notices.</p>
        <p>Provider information: <a href="https://workos.com/legal/privacy">WorkOS privacy</a>, <a href="https://docs.github.com/en/site-policy/privacy-policies">GitHub privacy</a>, <a href="https://vercel.com/legal/privacy-notice">Vercel privacy</a>, and <a href="https://neon.com/security">Neon security and privacy</a>.</p>
        <p>Public Problems, Contributions, evidence, and exact scientific records remain tied to their named source or Repository. A source&apos;s own rights and retention rules continue to apply.</p>
      </InformationSection>

      <InformationSection title="Retention and your choices">
        <p>Account and workspace information is kept while it is needed to provide the feature, preserve audit integrity, meet legal obligations, or resolve abuse and security issues. No shorter universal retention period is promised where the product does not enforce one.</p>
        <p>You can sign out, edit or hide your <Link href="/account/profile">public profile</Link>, manage the GitHub App from GitHub, disconnect a codebase from <Link href="/account/connections">Account connections</Link>, and request help with account data through <Link href="/contact">Contact</Link>. Removing an account clears its profile presentation and exact account-to-performer convenience links; old handles remain reserved against impersonation. Public, source-owned scientific history keeps its original attribution and may need a correction or superseding record rather than silent deletion.</p>
      </InformationSection>
    </PublicInformationPage>
  );
}
