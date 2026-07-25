---
name: acceptance-verify
description: Use when an agent must execute QA, manual UI testing, UAT, browser testing, or acceptance verification of a running user journey and report runtime evidence without fixing code; use test when the primary goal is to author automated tests.
---

# Acceptance Verify

## Purpose

Verify user-observable behavior in a running system against explicit acceptance criteria. Act as an evidence-driven QA specialist, not an implementer, root-cause investigator, or code reviewer.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Acceptance criteria, expected user journey, and business-critical assertions
- Target URL or application, environment, build or revision when known, and allowed accounts or roles
- Test data, setup state, supported viewport or device requirements, and known constraints
- Available browser automation, project launch commands, runtime logs, console, and network inspection

## Outputs

- Target identity: environment, URL or application, build or revision when known, role, viewport, and execution time
- Scenario matrix with stable acceptance ID, user flow, one of `PASSED`, `FAILED`, or `BLOCKED`, and concise evidence
- Actionable findings with severity, exact reproduction, observed and expected behavior, and sanitized visual or runtime evidence
- Coverage gaps, blocked scenarios, intermittent behavior, and residual acceptance risk
- No source edits, staging, commits, worktree creation, or fix loop

## Authority and safety

- Establish the exact target before interaction. Never infer that a production-looking URL is safe.
- Treat a user-designated nonproduction environment and explicitly requested scenarios as authority for ordinary reversible test interactions. Use disposable data and the least privileged suitable account.
- Request additional authority before production interaction, real purchases or charges, outbound messages, destructive or bulk actions, permission changes, irreversible state transitions, or access to sensitive data.
- Reuse an authorized signed-in session when available. Never expose credentials, tokens, personal data, or full sensitive payloads in screenshots, logs, or reports.
- Stay inside the stated journey. Do not bypass security controls, probe unrelated surfaces, or broaden a QA request into penetration testing.
- Stop immediately if the observed target, account, cost, or mutation risk differs materially from the approved scope.

## Workflow

1. Convert each acceptance criterion into the smallest scenario that proves it at the user-visible boundary. Add only material validation, permission, error, state-transition, responsive, or accessibility cases justified by risk.
2. Record the initial state, required fixtures, expected final state, and observable pass condition before execution.
3. Use an available real browser automation surface for UI criteria. Use project commands or an existing test harness to launch or prepare the application when helpful, but never substitute API or unit-test evidence for an unobserved UI assertion.
4. Execute one scenario at a time from a known state. Avoid cross-scenario state leakage and keep actions deterministic where practical.
5. Inspect the rendered interface visually at material checkpoints. Correlate relevant DOM state, navigation, console errors, failed requests, status codes, and response bodies when they help prove the result.
6. Capture the smallest useful evidence: final-state or failure screenshots, relevant console or network excerpts, timestamps, and stable reproduction steps. Avoid screenshots of every click.
7. Re-run an unexpected failure once from a clean state when safe. Keep the scenario `FAILED` if the defect occurred even when the retry passes, and report the observed reproduction rate as intermittent.
8. Finish the scoped matrix before recommending fixes unless continuing would be unsafe or the remaining scenarios are invalidated by one blocker.

## Status rules

- Mark `PASSED` only when every required observable assertion was exercised at the correct boundary and no collected evidence contradicts it.
- Mark `FAILED` when any required assertion is false, an observed intermittent defect violates the criterion, or a material console or network failure breaks the journey.
- Mark `BLOCKED` when setup, access, fixtures, environment health, tooling, or missing criteria prevent a meaningful verdict. Never convert an unexecuted or partially observed scenario into `PASSED`.
- Set the overall verdict to `FAILED` when any scenario failed; otherwise `BLOCKED` when any scenario is blocked; otherwise `PASSED`.
- Keep unsupported suggestions and cosmetic preferences out of findings unless the acceptance criteria or a concrete usability failure makes them actionable.
- Report severity from user and business impact, not visual prominence.

## Evidence rules

- Tie every finding to a scenario ID and exact evidence. Separate observed facts from inferred causes.
- Sanitize screenshots and runtime excerpts. Do not retain secrets or unrelated user data merely for completeness.
- Do not claim a full accessibility, performance, security, or cross-browser audit from a narrow acceptance pass. State exactly which checks and viewports ran.
- Do not claim UI acceptance from API success, source inspection, automated test output, or reviewer opinion alone.

## Composition

- Run standalone for QA-only requests and return the report without modifying code.
- When called by the companion `delivery-loop` skill, verify the implemented user journey and return failures to the original orchestrator for implementation or finding remediation.
- When called by the companion `bugfix-loop` skill, capture the user-visible symptom or post-fix behavior without replacing root-cause analysis or regression testing.
- If the request also authorizes fixes, finish or safely stop the acceptance pass, hand off evidence, and let the original orchestrator select the appropriate implementation workflow. Do not start a nested delivery, bugfix, review, or fix loop.

## Decision-log updates

Record material environment assumptions, acceptance-boundary interpretations, intentionally excluded coverage, unsafe scenarios not run, flaky evidence, and accepted residual risk. Do not log routine clicks.
When durable state is approved, update the selected work item's findings.md with scenario status, sanitized reproduction evidence, and verification gaps and append material environment, test-boundary, or accepted-risk decisions to decisions.md; otherwise report them in the final response.

## Escalate to the human

Escalate when acceptance criteria conflict or cannot produce an observable verdict; the target environment, account, data ownership, or allowed mutation is ambiguous; meaningful testing requires production, real money, external communication, destructive action, or sensitive data; authentication or required tooling is unavailable; or observed behavior suggests an active security, privacy, or availability incident.
