# problems.science × WebMCP

Written for the OpenAI WebMCP Challenge, August 2026.

## Why this application

The challenge asks what becomes possible when a web application exposes its
real semantic operations to an agent instead of making it click.

`problems.science` is an unusually direct answer, for a reason that predates the
challenge. The invariant a good answer has to demonstrate — that giving an agent
precise capabilities is not the same as giving it authority — is already this
product's machine-enforced boundary. Scientific Standing changes only through an
authorised, attributed Decision inside a Vela Repository, signed with a key the
hosted application does not hold and cannot obtain. Three independent gates fail
the build if hosted code tries otherwise.

So the WebMCP layer did not need a governance story invented for it. It needed
to inherit one.

## Architecture

```text
ChatGPT in-app browser / Chrome 149+ with WebMCP enabled
        │  document.modelContext.registerTool
        ▼
apps/problems/src/webmcp/          ← the entire agent interface
        │
        ├── reads  → @vela/projection-data   SELECT-only, exact, root-bound
        └── writes → the same Server Actions the human forms post to
                     → @vela/activity-data   authority_effect = 'none'
                                 │
                                 │  unsigned vela.submission.v3
                                 ▼
                    ══════════ HUMAN BOUNDARY ══════════
                                 ▼
                    local Workbench / vela CLI, user-held key
                    submit → verify → decide → replay
                                 ▼
                    Vela Repository (Git) → projection → Standing
```

Two planes, never merged:

- **Scientific state** is a SELECT-only projection built from canonical
  Repository Git commits by a digest-pinned Vela binary. The application reads
  it and fails closed on an unreadable release.
- **Work** is mutable hosted coordination in a separate database where every row
  carries `authority_effect = 'none'` and the command vocabulary is a closed
  allowlist of eight verbs enforced in SQL.

## The tools

Eight, registered per-Problem, unregistered on navigation.

| Tool | Reads | Writes | Notes |
| --- | --- | --- | --- |
| `inspect_problem` | projection | — | Question, current Result, Standing, sources, exact roots |
| `inspect_claim` | projection | — | Full lineage; Verifications keep their `does_not_establish` lists and are never summed into a verdict |
| `inspect_history` | projection | — | Proposals, Decisions, corrections, supersessions |
| `search_problems` | projection | — | Via the existing `/api/search` reader |
| `open_approach` | activity | activity | One Approach, one Attempt |
| `attach_evidence` | activity | activity | Artifact by content root, plus an attributed rationale note |
| `prepare_submission` | activity | activity | Unsigned `vela.submission.v3` |
| `inspect_candidate` | activity | — | What is pending, and against which unchanged Standing |

### Design decisions worth stating

**Writes call the human path.** Each write tool builds a `FormData` and calls
`createApproachAction`, `attachArtifactAction`, `saveSubmissionDraftAction` —
the exact functions behind the buttons. There is no agent-only business logic,
so an agent inherits the anchor-root staleness check, the idempotency key, and
the account requirement without any of them being re-implemented.

**The Problem is never an input.** The page knows which Problem it is; an agent
asked to name one could name the wrong one. Claim ids *are* inputs, because a
Problem holds several and the ambiguity is real.

**Failures are results, not exceptions.** A thrown error tells a model the tool
is broken. A returned `{ ok: false, error, detail, remedy }` tells it what to do
next, which is usually what is actually true — "sign in, then call this again".

**Verifications are not scored.** Each carries what it does not establish, and
they are returned as a list. Collapsing them into a verdict would hand the model
a number the product deliberately refuses to compute.

**Standing and source status stay separate.** `search_problems` returns both.
A collection calling something open is not an authority ruling on it.

**Registration follows the Problem.** Without an abort on unmount, a reader
moving from 321 to 887 would leave `inspect_problem` answering about 321 —
confidently, with exact roots, on a page showing something else. The context is
compared by value, because the server sends a fresh object every render.

## Security and governance

The claim is that WebMCP grants exactly the capabilities a signed-in person
already has and none beyond them. Four gates keep it true:

1. `packages/activity-data/schema/base.sql` — `activity_api.execute_command`
   accepts eight verbs and raises on anything else. No verb touches Standing.
2. `packages/activity-data/tests/governance.test.ts` — pins the exact list of
   ten Server Actions, in order. The WebMCP layer added none.
3. `scripts/check-scientific-authority-boundary.mjs` — a closed allowlist of
   files permitted to import `@vela/activity-data`, of route handlers, and of
   outbound fetches. The WebMCP modules and `/api/work` are named in it.
4. `apps/problems/src/webmcp/authority-boundary.test.ts` — reads the interface
   as bytes and refuses authoritative record names, signing calls, key material,
   verb shapes like `recordDecision` that nobody has written yet, and any tool
   name containing approve/accept/decide/sign/finalise.

Tool input is validated server-side by the Server Actions, not trusted because
it arrived through WebMCP. `/api/work` is scoped to the caller's own account by
the database function, not by anything in its query string.

## Known limitations

- **The loop closes outside the browser.** Signing and the Decision happen in a
  local tool with a user-held key. That is deliberate, and it means the
  in-browser demo ends at a pending candidate rather than at a moved Standing.
  The *past* half is real: Erdős 321 carries a signed, replayable correction the
  agent can read and explain.
- **`DecisionBoundary` still renders on nothing.** The projection nulls
  `decision_packet` for terminal Proposals, and every current Proposal is
  accepted. It lights up the first time a Proposal is open.
- **A clone needs a projection database.** The public repository carries the
  application but not a bundled dataset; the live URL is the way to exercise it.
- **The WebMCP API is young.** Types are declared locally rather than taken from
  a package, and the interface is feature-detected: a browser without it
  registers nothing and renders the ordinary site.

## Pre-existing work versus challenge additions

`problems.science` existed before 25 August 2026; the last commit before the
Submission Period is dated 23 August.

**Added during the Submission Period**

| Path | What |
| --- | --- |
| `apps/problems/src/webmcp/` | The eight tools, their schemas, result envelopes, the context builder, and the client registration component |
| `apps/problems/src/app/api/work/route.ts` | Account-scoped Workspace read, so a tool can see what it just created |
| `apps/problems/src/webmcp/*.test.*` | Tool behaviour, registration lifecycle, and the authority-boundary test |
| `scripts/scientific-authority-boundary.mjs` | Allowlist entries for the new modules and route |
| `README.md`, `docs/webmcp-*.md` | This write-up, the demo script, and the submission copy |
| repository extraction | Splitting the application out of a private monorepo so the source could be public |

**Pre-existing**

The Problem, Claim, Standing, Verification and Decision model; the exact
projection and its readers; the hosted Work plane and its Server Actions; the
`vela.submission.v3` draft and local-signing handoff; the three governance
gates; and the entire user interface.

## Manual test procedure

1. Open [Erdős 321](https://problems.science/problems/erdos-problems/321)
   in ChatGPT's in-app browser, or in Chrome 149+ with
   `chrome://flags/#enable-webmcp-testing` enabled and restarted.
2. Ask: *"Why does this Problem's current Result hold the Standing it does?"*
   Expect `inspect_claim` and `inspect_history`, and an answer naming the
   `claim_chain_fidelity` check, what it does not establish, and the signed
   Decision under event `vev_15632b53fb7fd674`.
3. Ask it to propose a change without signing in. Expect a refusal naming
   `not_signed_in` with a remedy, not a crash.
4. Sign in with the credentials in the submission's testing instructions, open
   the Work section, create a Workspace.
5. Ask the agent to open an approach, attach the Lean declaration as evidence,
   and prepare a Submission. Watch the Work section update.
6. Confirm `prepare_submission` returned `signing_state: "unsigned"`,
   `standing_changed: false`, and that the Problem's Standing is unchanged.
7. Append `?webmcp` to the URL to see the registered tool list.
8. Open the same page in a browser without WebMCP. Confirm the site is
   unchanged and nothing errors.
