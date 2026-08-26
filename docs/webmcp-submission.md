# Devpost submission copy

Draft for the WebMCP Challenge form. Fill the live URL and video link before
submitting.

---

## Project name

**problems.science**

Subtitle: *An agent-native workspace for cumulative science.*

## Elevator pitch (one line)

A scientific workspace where browser agents inspect exact state, attach
evidence and propose changes through typed operations — and cannot acquire the
authority to accept any of them.

## The problem (~130 words)

AI systems can already produce an enormous amount of scientific work. Almost
none of it compounds. It lands as conversation output, or as clicks through an
interface that was designed for a person, and in both cases the semantics are
lost on the way: a model that reads a page cannot reliably tell a Claim an
authority accepted from one that is merely written down, because on the way
through the DOM that distinction stops being data and becomes layout.

The instinct is to give agents more capability. The harder problem is that
capability without governance makes the output *less* usable, not more —
nobody can safely build on a result when they cannot reconstruct who established
it, what was actually checked, and what the check explicitly left open.

## What it does (~200 words)

problems.science is a workspace over scientific Problems. Each one carries exact
state: Claims and their Standing, the Submission that proposed each Claim, the
scoped Verifications that were run, and the signed Decision that accepted it.
That state is a read-only projection of canonical Git repositories, built by a
digest-pinned binary.

Every Problem page registers eight WebMCP tools. Four read the projection —
inspect a Problem, inspect one Claim's full lineage, read why a Standing holds,
search across the collection. Three write into a separate, non-authoritative
Work plane: open an attributed line of work, attach an artifact by its exact
content root with a written rationale, and prepare a Vela Submission. The eighth
reads back what is pending.

The write tools construct form data and call the same server actions the human
interface posts to. An agent gets exactly the capabilities a signed-in person
has — including the staleness check that refuses a mutation aimed at state that
has moved — and no others.

The furthest an agent can go is an unsigned Submission draft. The tool result
says so: `signing_state: "unsigned"`, `standing_changed: false`.

## Why WebMCP (~190 words)

Browser automation would give an agent the pixels. A backend MCP server would
give it a database. Neither gives it the thing that matters here, which is the
application's own semantics at the moment a human is looking at them.

WebMCP puts the tools on the page, which turns out to be exactly the right
boundary for this domain. The tools are scoped to the Problem in view, so an
agent cannot act on the wrong object; when the reader navigates, registration
aborts, because an `inspect_problem` still answering about the previous Problem
— confidently, with exact hashes — is worse than no tool at all. The agent and
the human share one live page, so work the agent records appears in the
interface as it happens, attributed, while they are both looking at it.

And because the tools live inside the application, they inherit its authority
boundary for free. The same closed command vocabulary, the same server-side
validation, the same inability to sign. A backend tool server would have had to
re-implement all of that, and would have been trusted to.

## Human and agent together (~130 words)

The agent reads the Problem, reads the Claim's lineage, and can explain why the
current Standing holds — naming the check that was run, what that check
explicitly does not establish, and the attributed Decision that accepted it. It
opens an approach, attaches evidence by content root with its reasoning, and
prepares a Submission.

Then it stops, visibly. The candidate appears in the human's Work section:
unsigned, with its payload root and the Claim it targets. To move Standing, the
person downloads it, signs it locally with a key this application has never
seen, and submits it to the repository, where verification and an attributed
Decision decide whether science accepts it.

The agent did real work. It did not acquire the authority to conclude anything.

## How it works (~200 words)

Next.js 16 on Bun. Two data planes that never merge.

Scientific state is a SELECT-only Postgres projection built from canonical Vela
repositories by a release binary verified by SHA-256 digest, not by version
string. Reads bind to one immutable release root and fail closed on a manifest
the build cannot read.

Hosted Work is a separate database where every row carries
`authority_effect = 'none'` and the mutation vocabulary is a closed allowlist of
eight verbs enforced inside a SQL function.

The WebMCP layer is one directory. It registers tools on
`document.modelContext`, feature-detected, with an `AbortController` per
Problem. Reads are answered from state the server already resolved and passed
down as props. Writes build form data and call the existing server actions.

Four gates keep the boundary honest: the SQL verb allowlist, a test pinning the
exact list of server actions, a repository-wide authority-boundary scanner, and
a test that reads the agent interface as bytes and refuses signing calls, key
material, and verb shapes like `recordDecision` that nobody has written yet.

## Relationship to Vela (~90 words)

```text
problems.science  =  the product humans and agents use
WebMCP            =  the agent interface into it
Vela              =  the protocol that makes changes governed and replayable
```

Vela defines how scientific state changes: Submission, Verification, an
authorised attributed Decision, then deterministic replay. Canonical records
live in Git repositories. problems.science is a read-only projection of those
records plus a non-authoritative coordination layer. It cannot issue a Decision
or hold a repository key, which is precisely what makes it safe to hand an agent
the keyboard.

## Built during the challenge

problems.science existed before the Submission Period; the last prior commit is
dated 23 August 2026. Added during it: the entire WebMCP layer
(`apps/problems/src/webmcp/`), the account-scoped Workspace read route, the
agent-interface test suites including the authority-boundary test, the
governance allowlist entries, and this documentation — plus extracting the
application from a private monorepo so the source could be public. Commit
history carries the dates; `docs/webmcp-challenge.md` enumerates the split.

## Impact

This does not solve science, and the demo does not pretend to. What it shows is
a shape: machine work can be precise, attributed, and consequential without
being autonomous, and the boundary can be enforced by tests rather than by
policy.

If agents are going to produce most scientific output, the question is not
whether they can act. It is whether what they produce can be built on. That
needs the state to be explicit, the provenance replayable, and the authority to
accept a result held by someone accountable for it.

## Technical stack

Next.js 16.3, React 19.2, TypeScript, Bun 1.3, Tailwind v4, Base UI / shadcn,
Postgres (Neon) across two isolated databases, WorkOS AuthKit, Vercel, and the
Vela protocol CLI (Rust) for repository state and replay.

## Testing instructions

**Live:** https://problems.science/problems/erdos-problems/321

**WebMCP:** ChatGPT's in-app browser, or Chrome 149+ with
`chrome://flags/#enable-webmcp-testing` enabled and restarted.

**Read-only, no account needed.** Ask: *"Why does this Problem's current Result
hold the Standing it does?"* Expect `inspect_claim` and `inspect_history`, and
an answer naming a `claim_chain_fidelity` check, what it does not establish, and
a signed Decision under event `vev_15632b53fb7fd674`.

**Governance, no account needed.** Ask it to propose a change while signed out.
Expect a structured refusal with a remedy, not an error.

**Write path.** Sign in with the credentials below, open the Work section and
create a Workspace, then ask the agent to open an approach, attach evidence and
prepare a Submission. Watch the interface update. Confirm the tool result says
`signing_state: "unsigned"` and `standing_changed: false`, and that the
Problem's Standing badge is unchanged.

**Tool inspector.** Append `?webmcp` to any Problem URL.

**Without WebMCP.** Open the same page in an ordinary browser. The site is
unchanged and nothing errors.

> Credentials: _fill before submitting_

## Repository

https://github.com/vela-science/problems — public, Apache-2.0.
