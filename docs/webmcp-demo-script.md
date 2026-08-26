# Demo video script

Target 2:40. Hard limit 3:00 — judges are not required to watch past it.

Record at 1440×900. One browser window, one Problem, no slide deck. Narration is
written to be read at an unhurried pace; the timings assume that.

---

## 0:00–0:18 — The problem with agents on the web

**Screen.** A Problem page on `problems.science`, still. Cursor does not move.

> An agent can already browse a scientific website. It can read this page and
> click these buttons. What it cannot do is tell the difference between a Claim
> that an authority accepted and one that is merely written down — because on
> the way through the DOM, that difference stops being data and becomes layout.

---

## 0:18–0:38 — What this is

**Screen.** Scroll slowly through Erdős 321: the current Result, its Standing
badge, the checks beneath it.

> This is problems.science. Every Problem here has exact state behind it —
> Claims, the evidence for them, the checks that were run, and the signed
> Decisions that moved them. It is a workspace for humans. Today it is also a
> workspace for agents, and they see the same state we do.

---

## 0:38–1:05 — Discovery

**Screen.** Open the agent side panel. Show the tool list. Hover two entries so
their descriptions are readable. Append `?webmcp` to the URL so the registered
tool list appears in the corner.

> The page registers eight tools with the browser. Not "click here" — scientific
> operations. Inspect a Claim. Read why a Standing holds. Attach evidence.
> Propose a change. The descriptions tell the model when to reach for each one,
> and what calling it costs.

---

## 1:05–1:45 — The agent answers a real question

**Type into the agent:**

> Why does this Problem's current Result hold the Standing it does?

**Screen.** Tool calls appear: `inspect_claim`, then `inspect_history`. Let the
answer render.

> It called two tools and answered from retained records. One scoped check,
> `claim_chain_fidelity` — and note what the check itself says it does *not*
> establish: not a proof, not a resolution, not acceptance. Then a signed
> Decision, by a named actor, under an event id, which corrected an earlier
> Claim.
>
> That is not summarised from the page. It is the lineage, as the Repository
> recorded it.

---

## 1:45–2:20 — The agent does work, and stops

**Type into the agent:**

> Open an approach for the Lean formalisation, attach the declaration as
> evidence, and prepare whatever Submission is warranted.

**Screen.** The Work section updates live as each tool lands: the Approach
appears, then the Attempt, then the artifact with its rationale. Then the
unsigned candidate.

> It opened a line of work, attached the artifact by its exact content root, and
> wrote down why. All of it attributed. All of it visible.
>
> Then it prepared a Submission — and stopped. The result says so in its own
> words: unsigned, no server-held key, Standing unchanged.

**Screen.** Highlight `signing_state: "unsigned"` and `standing_changed: false`
in the tool result. Then the Problem's Standing badge, still reading the same
thing it read at 0:18.

---

## 2:20–2:40 — Why it stopped

**Screen.** The candidate panel in the Work section, and its handoff steps.

> This application holds no signing key, and it cannot get one. To move
> Standing, a person downloads this candidate, signs it locally with a key only
> they hold, and submits it to the Repository, where verification and an
> attributed Decision decide whether science accepts it.
>
> WebMCP gave the agent precise capabilities. It did not give it authority.
> That distinction is enforced by four tests, not by a policy — and it is the
> reason an agent can be trusted to do real work here.

**Final frame.** The Problem page, Standing unchanged, candidate pending.

---

## Notes for the recording

- **Do not invent a result.** The Submission the agent prepares should assert
  something its producer checks genuinely establish — that a Lean declaration
  typechecks at a retained revision. Overclaiming on camera is the one mistake
  this project cannot afford to make.
- **Do not narrate the UI.** Judges can see a button. Narrate what is true
  underneath it.
- Have the Workspace already created and signed in before recording. Creating it
  on camera costs twenty seconds and shows nothing.
- Keep the Standing badge visible in the same screen position at 0:18 and 2:20.
  Unchanged state is the closing argument, and it only lands if it is literally
  the same pixels.
- If a tool call is slow, cut the wait. Do not cut a tool result.
