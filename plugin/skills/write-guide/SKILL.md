---
name: write-guide
description: Use when the primary task is to create or update a user guide, onboarding guide, setup guide, admin or operator manual, tutorial, or help-center documentation from current product behavior, including UI screenshots when useful; verify material runnable steps and mark anything not observed instead of inventing it. Do not activate solely for a one-off explanation, work item, API contract, or agent handoff.
---

# Write Guide

## Purpose

Create audience-focused product guidance grounded in current evidence.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Supplied audience, outcome, version, language, format, destination, and viewports; discover omissions before asking
- Existing guides, repository instructions, product terminology, source, routes, CLI help, configuration examples, and release notes
- Any available runnable target, safe fixtures, account role, and acceptance criteria

## Outputs

- An established-format update or copyable guide; a new standalone guide with unspecified format defaults to editable source plus visually verified PDF when supported
- Only needed sections, commonly goal, prerequisites, steps, expected results, troubleshooting, and version scope
- Sanitized image assets and accessible relative embeds for material observed UI states when the guide covers a visual journey
- A compact verification note identifying evidence used and any claims that remain `UNVERIFIED` or `BLOCKED`

## Workflow

1. Identify the reader's outcome and covered version. Ask only after discovery when an unknown changes instructions, safety, or destination.
2. Inspect repository instructions and existing documentation. Prefer updating the canonical guide over creating a competing page.
3. For a UI guide or multi-feature surface, read `references/ui-guides.md`; autonomously discover the runnable surface, routes, roles, visible actions, and layout evidence before asking, then map material outcomes to guides, captures, and verification.
4. Trace material steps to source, command help, configuration, tests, or observed runtime. Distinguish documented behavior from executed behavior.
5. Use `acceptance-verify` when a runnable user journey or rendered UI is material; keep unexecuted or partially observed behavior explicitly unverified or blocked.
6. Draft in the repository's established style and vocabulary. Use numbered actions for sequences, exact copyable commands, and expected results where readers need confirmation.
7. When producing a file, read `references/output-formats.md`; preserve established documentation, select contextual defaults, and activate an available format-specific skill or host capability for each derivative.
8. Capture actual rendered UI at material decision points or state changes using the repository's supported layout ranges; embed only useful, sanitized images with accessible text.
9. Recheck commands, paths, links, UI labels, permissions, prerequisites, captures, and version assumptions. For paginated output, render and inspect every page after the latest change.
10. Report the guide and asset locations, then summarize what was verified, what was not, and any product defect or documentation risk discovered.

## Rules

- Never invent commands, paths, UI labels, permissions, prerequisites, screenshots, or successful outcomes.
- Do not ask the user to enumerate discoverable features, routes, controls, or viewports; inspect the repository and runnable surface first.
- A request to create or update a local guide authorizes only the in-scope documentation change, not product-code changes, external publishing, or product decisions.
- For UI guides, capture actual rendered states at material checkpoints rather than every click; when many controls share one surface, prefer one contextual capture plus a concise action table.
- A PDF or other paginated deliverable is incomplete until every rendered page passes visual inspection after the latest meaningful change.
- Preserve accurate existing content, anchors, links, examples, and terminology unless the requested update supersedes them. Do not rewrite an entire guide for a localized correction.
- Keep safety warnings, destructive consequences, data-loss risk, required permissions, costs, and compatibility limits next to the affected step.
- Do not claim a UI step was verified from source inspection, an API response, or an automated test alone. Do not present `UNVERIFIED` or `BLOCKED` behavior as a successful procedure.
- When documentation exposes a product defect, record and report the evidence; do not fix product code unless the user separately authorizes implementation.
- Use `communicate-clearly` principles for wording, but keep `write-guide` as the owner of durable guide structure, source grounding, and verification status.
- Publishing to an external help center, wiki, project platform, or website requires explicit scoped authority and a capable connector. Without both, create only the local or copyable draft.

## Decision-log updates

Record only audience, scope, supported-version, information-architecture, verification-boundary, or accepted-risk choices that future maintainers must preserve. Routine wording and formatting need no decision entry.
When durable state is approved, append material audience, scope, version, verification-boundary, or accepted-documentation-risk decisions to the selected work item's decisions.md; otherwise include them in the final response.

## Escalate to the human

Escalate only after discovery when ambiguity still changes material instructions; sources conflict with runtime; verification requires unavailable access, production mutation, real money, destructive action, external communication, or sensitive data; regulated wording needs an owner; or a product decision blocks accurate guidance. Do not escalate for routine organization, capture framing, or wording.
