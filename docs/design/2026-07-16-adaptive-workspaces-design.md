# Adaptive Workspaces Design

Date: 2026-07-16  
Target release: 0.2.0  
Status: approved in conversation; pending written-spec review

## Goal

Make Nono Skills usable after installation without requiring users to initialize task files, choose a workspace, or run a `work` command. Codex should keep simple work lightweight and propose durable, isolated artifacts only when they will materially help.

The governing principle is:

> Codex owns the workflow plumbing; the human retains consent over new durable files and material scope changes.

## User experience

Installation remains a one-time action:

```bash
npx nono-skills install
```

After starting a new Codex task, the user speaks naturally or invokes an `engineering:*` skill explicitly. No project initialization or workspace command is required for normal use.

For a small, self-contained task, Codex works without creating workflow artifacts. For work that is likely to benefit from durable state, Codex proposes one feature workspace and asks for approval before creating it:

```text
งานนี้มีหลายขั้นตอนและควรเก็บสถานะข้าม task
ผมเสนอสร้าง docs/agent/work/2026-07-16-user-auth/
สำหรับ spec, plan และ decision log แล้วทำงานต่อภายใต้ scope นี้
อนุมัติไหม?
```

Once approved, Codex creates and maintains the artifacts within that work item's approved scope. The user does not manage filenames or repeat approval for each file.

## Adaptive persistence

Codex classifies each request as transient or durable using judgment rather than fixed file-count or duration thresholds.

Durable artifacts are appropriate when at least one of these conditions materially applies:

- the user explicitly requests a spec, plan, progress log, decision log, findings tracker, or handoff
- the work is likely to continue across Codex tasks or require another agent to resume it
- the change spans multiple components, phases, or independently verifiable outcomes
- the work includes migration, security, release, compatibility, or other meaningful risk
- a review-and-fix loop needs finding lifecycle tracking
- unresolved product or architecture decisions must survive beyond the current conversation

Localized, one-shot work such as a typo, small documentation correction, or obvious low-risk edit remains transient unless the user asks for durable records.

If the user declines a proposed workspace, Codex continues within the authorized task without creating workflow files. Material decisions and remaining risks are reported in the final response.

## Consent model

Consent is scoped to one work item, not granted globally.

### Consent is already present when

- the user explicitly asks Codex to create or maintain durable artifacts
- the user explicitly names an existing work item and asks Codex to continue it
- the current Codex task already received approval for that work item and the scope has not materially changed

Codex must not ask a redundant confirmation in these cases.

### Codex must ask when

- Codex, rather than the user, decides a new durable workspace would help
- more than one existing work item plausibly matches the request
- the requested work materially expands beyond the approved work-item scope
- a new breaking, destructive, production, external-system, or significant-spend action needs authority

The workspace approval covers creating and updating artifacts inside the stated work-item scope. It does not broaden authorization for commits, pushes, deployments, production changes, external writes, destructive actions, or unrelated implementation.

The original request controls implementation authority. “Implement this” authorizes ordinary in-repository implementation, while “plan this” stops after planning for review. A material product choice, risk acceptance, or scope expansion still requires human input.

## Work-item layout

Each durable feature or task receives an isolated directory:

```text
docs/agent/work/<work-id>/
├── spec.md
├── plan.md
├── decisions.md
├── findings.md
└── handoff.md
```

Files are created lazily:

- `spec.md` records goal, scope, constraints, acceptance criteria, metadata, and status. It is the anchor for every durable work item.
- `plan.md` is created when execution has multiple outcomes, dependencies, or verification targets.
- `decisions.md` is created on the first material decision and remains append-oriented. Routine edits and shell commands are not logged.
- `findings.md` is created when review findings need lifecycle tracking.
- `handoff.md` is created only when work remains, ownership changes, or another Codex task must resume the work.

There is no mutable global index. The directory structure is the index, avoiding contention across branches and worktrees. Completed directories are not moved to an archive because moving them would break links and historical references.

Cross-feature ADR management is outside the 0.2.0 scope. A work-item decision that later becomes repository-wide can be promoted separately when the user requests it.

## Work identity and metadata

`spec.md` begins with small machine-readable front matter:

```yaml
---
work_id: issue-123-user-auth
title: User authentication
status: active
issue: 123
branch: feat/user-auth
created: 2026-07-16
updated: 2026-07-16
---
```

Supported statuses are `active`, `blocked`, `completed`, and `superseded`. Reopening completed work changes it back to `active` and records the reason as a material decision.

Work IDs are stable after creation:

1. Use an issue or ticket identifier when supplied, such as `issue-123-user-auth`.
2. Otherwise use `YYYY-MM-DD-<goal-slug>`.
3. If that path already belongs to different work, append a numeric suffix instead of overwriting it.

The branch is metadata, not identity. Branches can be renamed, reused, or absent.

## Resolving the current work item

Skills use this order when resuming durable work:

1. Continue the work item already approved in the current Codex task.
2. Honor an explicit work ID, path, issue, or ticket in the user's request.
3. Match an exact issue or ticket in work-item metadata.
4. Match the current non-default branch when exactly one active item records it.
5. Use an existing active item only when its goal and scope clearly match the request.
6. If no item matches, classify the request and propose a new workspace only when it is durable.

Recency alone is never sufficient. If multiple items remain plausible, Codex asks the user to choose rather than silently updating the wrong feature.

## Skill architecture

The existing 15 intent skills remain the public surface. No user-facing `work` command or mandatory router skill is added.

A shared protocol bundled with the plugin defines adaptive classification, consent, path resolution, lifecycle, and artifact rules. Every skill references that protocol and retains only its intent-specific behavior. This keeps the rules consistent without copying a long workflow into every `SKILL.md`.

The skills apply the protocol as follows:

- `brainstorm`, `plan`, `estimate`, `api-design`, `database-design`, and `migration` create or update planning artifacts when the work is durable and consent exists.
- `implement`, `test`, `debug`, and `refactor` update the current plan and material decisions when a work item is active.
- `review`, `architecture-review`, and `security-review` create or update findings only when durable tracking is approved; otherwise they report findings in the response.
- `fix-findings` updates finding status and verification evidence in the selected work item.
- `release-readiness` reads the work item's acceptance criteria, findings, plan, and verification evidence when available.

Codex may still select the smallest applicable skill implicitly from its description. Explicit `$engineering:<skill>` invocation remains available but is never required for workspace management.

## Project initialization

`npx nono-skills init` remains optional and creates repository-specific `AGENTS.md` guidance only. It no longer creates singleton `docs/agent/spec.md`, `plan.md`, `decision-log.md`, `findings.md`, or `handoff.md` templates.

The plugin works without `init`. Repositories that already have an `AGENTS.md` continue to use their own instructions.

Existing 0.1.0 singleton artifacts and ownership state are preserved during update. Version 0.2.0 does not move, merge, or delete them automatically. New durable work uses per-work-item directories. Legacy files may be read when the user explicitly identifies them or their relevance is unambiguous.

Uninstall and project purge must never delete work-item directories because their contents are user-owned from creation.

## Failure and conflict behavior

- If the proposed work-item path conflicts with unrelated contents, Codex selects a suffixed path and does not overwrite the existing directory.
- If filesystem permissions or repository constraints prevent artifact creation, Codex reports the failure and continues in-chat when the requested work can still be completed safely.
- If artifact creation partially succeeds, Codex reports exactly what exists and resumes from that state rather than recreating or deleting user content.
- If repository instructions prohibit generated documentation or require another location, those repository instructions win and Codex proposes the compliant path before writing.
- If the user declines durable artifacts, skills must not quietly create equivalent files elsewhere.

## Documentation changes

The README will lead with the zero-ceremony flow:

1. Run `npx nono-skills install` once.
2. Start a new Codex task.
3. Ask for engineering work naturally.
4. Approve a durable workspace only when Codex proposes one.

The skill-selection table remains as an optional reference. `init` moves to an advanced, repository-guidance section. Examples show transient work, explicit artifact requests, Codex-proposed workspaces, approval, resumption, and declining persistence.

## Verification

Automated tests will cover:

- all 15 skills reference the shared workspace protocol
- no skill instructs Codex to use the old singleton artifacts as the default
- the shared protocol contains adaptive classification, consent, resolution, and lifecycle rules
- `init` creates only the repository guidance template and records ownership correctly
- uninstall and purge preserve all files under `docs/agent/work/`
- 0.1.0 singleton files survive update and 0.2.0 initialization
- bundle and package validation include the shared protocol and all 15 skills
- README examples match actual CLI behavior and paths

Manual scenario validation will exercise:

1. a trivial task that creates no artifacts
2. an explicit request for a plan that needs no redundant confirmation
3. a durable task where Codex proposes a workspace and waits for approval
4. a declined workspace followed by in-chat completion
5. resuming exactly one matching work item
6. ambiguity between multiple active items that triggers a user choice
7. completion and later reopening without moving the directory

## Success criteria

- A new user can install the package and use the skills without running `init` or learning a workspace command.
- Small tasks do not create workflow clutter.
- Codex never creates an agent-proposed durable workspace without consent.
- One approval is sufficient for artifact maintenance within the approved work-item scope.
- Multiple features do not share mutable task artifacts.
- Skills do not silently select a work item based only on recency.
- Existing 0.1.0 project files are preserved.
- The complete package test and validation suites pass before publishing 0.2.0.

## Non-goals

- Reproducing Superpowers' mandatory brainstorming, test-first, worktree, or subagent gates
- Asking for approval before every artifact update
- Creating a new CLI command for work-item management
- Automatically committing work-item artifacts
- Automatically migrating or deleting 0.1.0 project files
- Providing a global dashboard or mutable index of all work items
- Publishing, pushing, disabling Superpowers, or changing external systems without separate authorization
