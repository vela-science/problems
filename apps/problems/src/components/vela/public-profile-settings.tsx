"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUpRight01Icon, UserCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Avatar, AvatarFallback } from "@vela/ui/components/avatar";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { Label } from "@vela/ui/components/label";
import { Textarea } from "@vela/ui/components/textarea";
import {
  savePublicProfileAction,
  type ProfileActionState,
} from "@/app/actions/profile";

const initialProfileActionState: ProfileActionState = { status: "idle", message: "" };
import type { PublicProfile } from "@/lib/hosted-account";

function initials(name: string) {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function SubmitProfile() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save public profile"}</Button>;
}

const visibilityOptions = [
  { value: "private", label: "Private", detail: "Only you can preview it." },
  { value: "unlisted", label: "Unlisted", detail: "Anyone with the exact link can open it." },
  { value: "public", label: "Public", detail: "It may appear beside linked attribution." },
] as const;

export function PublicProfileSettings({ profile, accountName }: { profile: PublicProfile | null; accountName: string }) {
  const [state, action] = useActionState(savePublicProfileAction, initialProfileActionState);
  const displayName = profile?.displayName ?? accountName;
  const currentHandle = state.handle ?? profile?.handle ?? "";
  const feedback = state.status === "success" || state.status === "error" ? state : null;
  /* No card. Its two sibling pages use a flat section under a rule, and this
     one wrapped everything in `vela-object-surface`, so three pages under
     /account had three container idioms. The heading inside it — "Public
     contributor profile" — restated the page's own h1, and the paragraph
     beneath it was the boundary disclaimer, said here for the eighth time. */
  return <section aria-label="Public contributor profile" className="flex flex-col gap-7">
    <div className="flex flex-wrap items-center gap-3 border-b pb-5">
      <Avatar className="size-11 shrink-0 bg-primary/8">
        <AvatarFallback>{initials(displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-eyebrow text-muted-foreground">Currently</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-label font-medium">
          {currentHandle
            ? <span className="font-mono">problems.science/people/{currentHandle}</span>
            : <span className="text-muted-foreground">Not created</span>}
          {profile ? <Badge variant={profile.visibility === "public" ? "default" : "secondary"}>{profile.visibility}</Badge> : null}
        </p>
      </div>
      {currentHandle ? <Button className="ml-auto" size="sm" variant="outline" nativeButton={false} render={<Link href={`/people/${currentHandle}`} />}>
        Preview <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden data-icon="inline-end" />
      </Button> : null}
    </div>

    <form action={action} className="space-y-6">
      <input type="hidden" name="version" value={state.version ?? profile?.version ?? 0} />
      {feedback ? <Alert variant={feedback.status === "error" ? "destructive" : "default"}>
        <HugeiconsIcon icon={UserCircle02Icon} aria-hidden />
        <AlertTitle>{feedback.status === "error" ? "Profile not saved" : "Profile saved"}</AlertTitle>
        <AlertDescription>{feedback.message}</AlertDescription>
      </Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-display-name">Display name</Label>
          <Input id="profile-display-name" name="displayName" maxLength={120} required defaultValue={profile?.displayName ?? accountName} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-handle">Handle</Label>
          <div className="flex rounded-md border bg-background focus-within:ring-3 focus-within:ring-ring/50">
            <span className="flex items-center border-r px-3 text-meta text-muted-foreground">/people/</span>
            <Input id="profile-handle" name="handle" className="border-0 shadow-none focus-visible:ring-0" maxLength={39} required defaultValue={profile?.handle ?? ""} placeholder="your-name" autoComplete="off" aria-describedby="profile-handle-help" />
          </div>
          <p id="profile-handle-help" className="text-meta text-muted-foreground">Lowercase letters, numbers, and interior hyphens. Old handles redirect and cannot be reused.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-bio">Short bio</Label>
        <Textarea id="profile-bio" name="bio" maxLength={800} rows={4} defaultValue={profile?.bio ?? ""} placeholder="What you work on and how you contribute." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-affiliation">Affiliation</Label>
        <Input id="profile-affiliation" name="affiliation" maxLength={240} defaultValue={profile?.affiliation ?? ""} placeholder="Lab, institution, or independent" />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-label font-medium">Visibility</legend>
        <div className="grid gap-2 lg:grid-cols-3">
          {visibilityOptions.map((option) => <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input className="mt-1 size-4 accent-primary" type="radio" name="visibility" value={option.value} defaultChecked={(profile?.visibility ?? "private") === option.value} />
            <span><span className="block text-label font-medium">{option.label}</span><span className="mt-0.5 block text-meta text-muted-foreground">{option.detail}</span></span>
          </label>)}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-label font-medium">Declared links</legend>
        <p className="text-meta text-muted-foreground">These are shown as links you supplied. GitHub sign-in status remains separate.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["github", "GitHub profile", "https://github.com/your-name"],
            ["orcid", "ORCID", "https://orcid.org/0000-0000-0000-0000"],
            ["website", "Personal site", "https://example.org"],
            ["lab", "Lab or organization", "https://example.org/lab"],
          ] as const).map(([name, label, placeholder]) => <div className="space-y-2" key={name}>
            <Label htmlFor={`profile-${name}`}>{label}</Label>
            <Input id={`profile-${name}`} name={name} type="url" inputMode="url" maxLength={500} defaultValue={profile?.links[name] ?? ""} placeholder={placeholder} />
          </div>)}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <p className="max-w-xl text-meta text-muted-foreground">Email, WorkOS identifiers, sessions, private repository access, and private work never appear on this page.</p>
        <SubmitProfile />
      </div>
    </form>
  </section>;
}
