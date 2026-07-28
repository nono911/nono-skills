# Agent Delegation

Use this contract only inside an explicitly invoked delivery loop. Native host
agents remain the default. External CLI agents are optional local collaborators,
not replacements for the original orchestrator.

## Activation

At the delivery-loop approval gate, offer `Native subagents (default)`,
`External CLI agents`, and `Hybrid`. An approval that does not select an
agent-execution choice selects Native subagents. Provider installation, enablement,
or saved preference never selects the external path.

Do not probe, propose, or invoke an external provider until the user selects
External or Hybrid, names an external provider, or explicitly asks for external
options. If the user selects an external path without naming a provider, run the
local capability probe, present only compatible roles, and obtain exact provider
and data-sharing consent before any agent call.

## Eligibility

Delegate only when the work is meaningfully independent, the expected quality
or elapsed-time benefit outweighs coordination cost, and the agent can receive
a bounded task packet.

- Keep small or tightly coupled work with the original orchestrator.
- Prefer native agents for exploration, test analysis, and other read-heavy work.
- Use an external reviewer when provider diversity would strengthen independence.
- Use external write workers only for disjoint file-ownership boundaries in
  approved child worktrees.
- Never invoke a provider that owns the current host task.
- Never invoke the same harness that owns the current host task; use its native agent mechanism.
- Do not delegate merely because another provider is installed.

The bridge uses provider adapters for Claude Code, OpenAI Codex, Qwen Code,
OpenCode, and CodeWhale. It detects Google Antigravity but does not automate the
TUI because no verified one-shot contract is available. Every future adapter must
implement the same consent, task-packet, isolation, result, and failure contracts.
Do not substitute an arbitrary executable or user-supplied command for a reviewed
adapter.

## Capability probe

Resolve this reference and `../scripts/agent-bridge.mjs` relative to the selected
delivery-loop `SKILL.md`.

After external execution is selected, run the local probe before proposing a
specific external delegation:

```text
node <skill-root>/scripts/agent-bridge.mjs detect --json
```

The probe executes only local `--version`, `--help`, and a provider's documented
local capability or doctor command. It must not authenticate, perform a live API
connectivity check, send source code, consume an agent turn, or mutate
configuration.
Prefer providers recorded as enabled within the opted-in external path. A
compatible unconfigured provider may be proposed only after that opt-in; treat
unavailable, disabled, incompatible, or current-host providers as ineligible.

Use the returned role map. Detection does not imply that both roles are safe:

- `review` requires a noninteractive read-only boundary and a validated result.
- `implement` additionally requires worktree-confined writes and an approved child worktree.
- A detected interactive-only harness remains visible for diagnostics but is not eligible.

Record the actual harness, model provider, and model when the adapter can discover
them. Harness diversity is not model diversity: OpenCode or CodeWhale using the
same model as the author is not an independent provider merely because the
executable name differs.

## Consent

External-agent enablement never authorizes a run. Obtain explicit per-run consent
before sending any repository content or starting an external agent.
Combine this with the delivery loop's worktree and commit request when possible.

State:

- provider and role
- data and source scope the provider may receive
- read-only or write capability
- exact child worktree paths for write workers
- maximum calls, timeout, and budget when available
- durable provider policy: `review-only` or `isolated-writer` when the user elects to save one
- whether provider results can create additional review or remediation work

Offer native-only execution without penalty. A user may allow review but decline
external implementation. Do not remember cross-project consent unless the user
explicitly requests durable configuration.

## Task packet

Give every native or external worker the smallest sufficient packet:

```json
{
  "task_id": "stable-local-id",
  "role": "review",
  "goal": "review the approved feature snapshot",
  "acceptance_criteria": ["observable requirement"],
  "repository_instructions": ["applicable rule"],
  "base_sha": "immutable baseline",
  "head_sha": "review target when applicable",
  "input_digest": "sha256:<64 lowercase hex characters>",
  "worktree": "/approved/path",
  "read_scope": ["approved worktree"],
  "write_scope": [],
  "verification": ["exact command owned by orchestrator"],
  "evidence": ["sanitized diff, logs, or prior result"],
  "forbidden_actions": [
    "delegate again",
    "read secrets",
    "commit",
    "push",
    "merge",
    "deploy",
    "change external state"
  ],
  "output_contract": "bridge-enforced implement or review schema"
}
```

For implementation, set `role` to `implement` and provide a non-empty,
disjoint `write_scope`. Review packets must keep `write_scope` empty.

Do not serialize the full conversation, environment values, ignored secret files,
credentials, or unrelated source into the task packet. Pass accepted requirement
decisions, not the implementer's conclusions.

Canonicalize and hash the task packet with `input_digest` omitted plus its
supplied diff, status, and file manifest as `input_digest`. The result must echo
`task_id`, `base_sha`, and `input_digest`, declare `scope_completed`, distinguish
evidence-backed
`verification` from `verification_not_run`, and return questions and proposed
decision-log records. Before accepting a review result, recompute the digest and
confirm the worktree did not change during the call.

## External execution

Write the approved task packet to a temporary or approved work-item file without
secrets. Create transient prompt files with owner-only permissions where the
platform supports them, and remove them after the call. Then invoke:

```text
node <skill-root>/scripts/agent-bridge.mjs run \
  --provider <claude|codex|qwen|opencode|codewhale> \
  --mode review \
  --cwd <approved-worktree> \
  --prompt-file <task-packet> \
  --consent
```

For a write worker, use `--mode implement` only in its approved child worktree and
only when the provider's current role map includes `implement`. The original
orchestrator owns Git operations, integration, official verification, and commits.
The bridge requires packet role, worktree, HEAD, base commit, read scope, write
scope, and forbidden-action fields to match the invocation before it starts the
provider. Review mode additionally requires a clean approved worktree before the
call and rejects the result if HEAD or worktree cleanliness changed during the
call. Implementation mode permits approved file changes but still rejects a HEAD
change because the original orchestrator owns Git.

The adapters tighten their native surfaces:

- Claude Code uses safe mode, no session persistence, no shell, and file-tool rules scoped to the approved worktree.
- Codex uses an ephemeral run, ignores user config, disables nested agents, and selects `read-only` or `workspace-write` sandboxing.
- Qwen Code uses safe mode, a required sandbox, bounded turns/tools/time, no shell, web, or nested agents, and plan mode for review.
- OpenCode requires pure mode and a deny-by-default inline permission policy; shell, plugins, skills, web, subagents, and external directories stay denied.
- CodeWhale requires a doctor-reported OS sandbox and runs with shell disabled, nested agents clamped, and `read-only` or `workspace-write` sandboxing.

Safe modes may intentionally disable repository skills and customizations. Embed
the canonical companion `review` or implementation assessment and output contract
in the approved task packet; do not ask an external worker to discover or activate
the skill itself.

Use `--max-budget-usd <amount>` when the provider and account support it,
`--max-turns <count>` or `--max-tool-calls <count>` when supported, and
`--timeout-ms <milliseconds>` when the default ten-minute bound is unsuitable.
The bridge applies provider-native limits where available and always enforces the
outer wall-clock timeout. Never use a permission-bypass flag. Schema-capable
providers receive the bridge schema natively; other adapters normalize their final
machine-readable event and then apply the same validation. Malformed, partial, or
failed envelopes are rejected before the orchestrator receives a worker result.
Timeout first requests graceful termination, then hard-kills the provider process
group on Unix or the direct provider process on other platforms.

The subprocess inherits the user's environment so the installed CLI can locate
its executable, configuration, proxy, and authentication. Do not serialize
environment values into the prompt or result. The absence of Bash prevents the
worker from enumerating them through a shell.

Treat the approved read scope as the full child worktree plus dependencies the
provider's file tools may resolve. A working directory alone is not an OS-level
read boundary. If consent is narrower, use a separately sanitized checkout or
keep the task with a native agent. A tool policy is not an OS sandbox; report the
adapter's actual boundary rather than describing all providers as equivalent.

## Write isolation and integration

- Assign one writer per file-ownership boundary.
- Never run concurrent writers over overlapping paths or the integration worktree.
- Keep each external writer in an approved child worktree based on the recorded
  delivery baseline.
- Require the worker to return changed files, summary, assumptions, risks, and
  claimed verification.
- Inspect the complete child diff before integration. Reject out-of-scope edits,
  secrets, generated noise, and unexplained files.
- Inspect the complete child state, including tracked, untracked, renamed, deleted,
  generated, and binary files. Record the integration method and transfer only
  approved paths into the delivery worktree.
- Integrate only validated changes into the delivery worktree. The orchestrator
  reruns required checks and creates the authorized implementation commit.
- Preserve child worktrees for inspection unless removal was separately authorized.

## Review results

A review result is `CLEAN` only when its status is `completed`,
`scope_completed` is true, its normalized findings array is empty, its task
identity and input digest match, and the reviewer completed the full requested
scope against an unchanged snapshot. Each finding must contain:

- stable ID
- severity
- location
- evidence
- impact
- remediation direction

Treat a malformed, partial, timed-out, or tool-denied result as failed delegation,
not as `CLEAN`.

An external provider that wrote any part of the feature must not be the sole
general reviewer for that feature. Keep a fresh eligible reviewer with a distinct
author context in the batch. Prefer a different underlying provider/model as well
as a fresh session when provider diversity matters; external review may supplement
the host's native reviewer.

## Failure and fallback

- Do not retry an external paid or allowance-consuming run without remaining
  consent and budget. Default to one retry only for a clearly transient failure.
- Track aggregate calls and cost in the orchestration ledger; the bridge enforces
  one bounded call at a time, not the aggregate allowance.
- Fall back to a fresh native agent only when it preserves independence and the
  requested read/write boundary; disclose the fallback.
- Reject results that cross scope, omit required evidence, or conflict with
  repository instructions.
- Escalate provider disagreement that changes acceptance behavior or public
  contracts.
- Report provider, role, call count, integration disposition, failures, and
  residual risk at the end of the delivery loop.
