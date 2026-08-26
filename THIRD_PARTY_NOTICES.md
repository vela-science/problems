# Third-party notices

This site uses the following third-party software, fonts, and licensed design
references:

- Next.js, React, Tailwind CSS, shadcn, Base UI, and other JavaScript
  dependencies under the licenses recorded in their packages and lockfile.
- Hugeicons React 1.1.9 and Hugeicons Core Free Icons 4.2.3 under the MIT
  License. They are the Problems's single interface icon system.
- IBM Plex Mono under the SIL Open Font License 1.1. The served files are
  Latin subsets; the font name and license terms remain those of its authors.
- Zodiak, Gambetta, and Switzer, all Indian Type Foundry, under the ITF Free
  Font License, which permits commercial use and self-hosting of the web font
  files. They ship as their variable masters. They replaced Newsreader and
  Inter on 2026-07-27.
- Tailwind Plus and shadcn.io Pro under purchased commercial licenses.
  Selected patterns informed this application's own components, and each place
  that studied one says so in a source comment and in
  `docs/editorial-references.md`.

  Both licenses permit an end product like this one. Their shared clause allows
  "creating a web application where the primary purpose is clearly not to
  simply re-distribute the components or libraries ... that is free and open
  source, where the source code is publicly available." Problems is a
  scientific workspace; redistributing UI components is not what it is for.

  What both licenses forbid, and what this repository therefore does not do:
  publish a repository of the components themselves, ship a UI library or
  starter kit, or make any workspace package separately installable.
  `@vela/ui` is application source, not a distributable library —
  `scripts/check-release-identity.mjs` keeps every manifest `private` so no
  part of this workspace can reach a package registry by accident, and the
  private component catalogue that used to live at `packages/ui/registry.json`
  and `packages/ui/lab/` is not part of this repository.

Images under `public/images/` are original project assets unless a nearby
source note says otherwise. The July 2026 designer-handoff reference images are
not shipped.
