---
name: security-review
description: Use when security is the primary assessment objective for code, configuration, architecture, identities, data handling, or a change set.
---

# Security Review

## Purpose

Identify plausible, evidence-backed security weaknesses across trust boundaries, attacker-controlled inputs, identities, secrets, data, and operational controls. Review is read-only.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Defined scope, threat assumptions, and deployment context
- Code, dependencies, configuration, infrastructure, schemas, and auth flows
- Existing security findings, tests, and compensating controls

## Outputs

- Findings ordered by exploitability and impact, with evidence and attack path
- Affected assets, preconditions, remediation direction, and confidence
- Coverage limits and residual risks

## Rules

- Map trust boundaries and attacker capabilities before applying checklists.
- Check authentication, authorization, injection, XSS, CSRF, SSRF, secret handling, cryptography, data exposure, dependency risk, abuse controls, and logging where relevant.
- Never include live secrets, exploit unrelated systems, or perform destructive testing.
- Distinguish confirmed vulnerabilities from hardening opportunities.
- Do not edit code unless the user separately requests remediation.

## Decision-log updates

Log only accepted security tradeoffs, threat-model assumptions, compensating controls, or risk acceptance decisions.
When durable state is approved, track sanitized vulnerabilities in the selected work item's findings.md and append accepted security tradeoffs, threat assumptions, compensating controls, or risk acceptance to decisions.md; otherwise report them in the final response.

## Escalate to the human

Escalate immediately for plausible critical exposure, active compromise indicators, secrets in version control, testing that may affect real users, or remediation requiring risk acceptance. Avoid broadcasting sensitive details beyond the authorized audience.
