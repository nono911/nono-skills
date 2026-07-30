# External Agent Delegation

Read this reference only after the user selects External or Hybrid execution,
names an external provider, or asks for external-agent options. Native host agents
remain the default.

## 1. Select an eligible provider

Delegate only bounded work whose benefit exceeds coordination cost. Never invoke
the current host harness as an external child; use its native agent mechanism.
An external writer must own disjoint files in an approved child worktree. An
external reviewer must be fresh and read-only, and a provider that implemented
part of the feature must not be its sole general reviewer.

Reviewed adapters exist for Claude Code, OpenAI Codex, Qwen Code, OpenCode, and
CodeWhale. Google Antigravity is detected but not automated because its verified
surface is interactive. Do not substitute arbitrary commands for reviewed
adapters.

After external execution is selected, resolve the bridge relative to this skill
and run the local-only probe:

```text
node <skill-root>/scripts/agent-bridge.mjs detect --json
```

The probe may inspect local version, help, and documented offline capability
commands. It must not authenticate, contact a provider, send repository content,
consume an agent turn, or mutate configuration. Treat disabled, incompatible,
interactive-only, unavailable, and current-host providers as ineligible. Use the
bridge role map: `review-only` never writes; `isolated-writer` merely permits a
write proposal and grants no run authority.

## 2. Obtain per-run consent

Provider setup never authorizes execution. Before every external run, state and
obtain consent for:

- provider, role, and repository/source scope
- read-only or write capability and child-worktree path
- maximum calls, timeout, and budget when supported
- whether results may create follow-up review or remediation work

Offer native-only execution without penalty. Do not persist consent across
projects unless the user explicitly requests durable configuration.

## 3. Build the task packet

Send only accepted requirements, applicable repository rules, immutable base and
target identity, approved scopes, sanitized evidence, and the output contract.
Never send the full conversation, secrets, environment values, ignored
credential files, or unrelated source.

The packet must include:

```json
{
  "task_id": "stable-local-id",
  "role": "review",
  "goal": "bounded goal",
  "acceptance_criteria": ["observable requirement"],
  "repository_instructions": ["applicable rule"],
  "base_sha": "immutable baseline",
  "head_sha": "review target",
  "input_digest": "sha256:<64 lowercase hex characters>",
  "worktree": "/approved/path",
  "read_scope": ["/approved/path"],
  "write_scope": [],
  "verification": ["orchestrator-owned command"],
  "evidence": ["sanitized diff or log"],
  "forbidden_actions": [
    "delegate again",
    "read secrets",
    "commit",
    "push",
    "merge",
    "deploy",
    "change external state"
  ],
  "output_contract": "bridge-enforced role schema"
}
```

Implementation packets use `role: implement` and a non-empty disjoint
`write_scope`; review packets keep it empty. Canonicalize and hash the packet
without `input_digest`, together with its supplied diff, status, and manifest.

## 4. Execute through the bridge

Write the approved packet to an owner-readable temporary or approved work-item
file and remove transient prompt files afterward. Invoke:

```text
node <skill-root>/scripts/agent-bridge.mjs run \
  --provider <claude|codex|qwen|opencode|codewhale> \
  --mode <review|implement> \
  --cwd <approved-worktree> \
  --prompt-file <task-packet> \
  --consent
```

Use provider-native call or budget limits only when supported and always set an
appropriate wall-clock timeout. Never bypass permissions. The bridge and adapter
scripts are authoritative for provider flags, sandboxing, schemas, process
termination, and output normalization; do not duplicate or override them from
memory.

Safe external modes may disable repository skills. Embed the required assessment
and output contract in the packet instead of asking the worker to discover a
skill. A working directory is not an OS-level read boundary; if the provider's
actual boundary is broader than approved consent, use a sanitized checkout or
stay native.

## 5. Validate and integrate

Reject a result that is malformed, partial, timed out, tool-denied, stale,
out-of-scope, or mismatched on `task_id`, `base_sha`, or `input_digest`. Require
`scope_completed`, changed files for writers, evidence-backed verification,
unrun-check disclosure, questions, risks, and proposed decision records.

Review is `CLEAN` only when the requested scope completed against an unchanged
snapshot and the normalized findings array is empty. Each finding needs stable
ID, severity, location, evidence, impact, and remediation direction.

Inspect every tracked, untracked, renamed, deleted, generated, and binary child
change. Transfer only approved paths into the delivery worktree, rerun
orchestrator-owned checks, and keep Git operations and commits with the
orchestrator. Preserve child worktrees unless removal is separately authorized.

## 6. Fail safely

- Do not retry a paid or allowance-consuming run without remaining authority and
  budget; allow at most one retry for a clearly transient failure.
- Fall back to a fresh native agent only when it preserves independence and the
  requested boundary, and disclose the fallback.
- Escalate provider disagreement that changes acceptance behavior or a public
  contract.
- Report provider, role, call count, integration disposition, failures, and
  residual risk.
