---
name: security-review
description: Use when security is the primary assessment objective for code, configuration, architecture, identities, data handling, or a change set.
---

# Security Review

## Purpose

Identify plausible, evidence-backed security weaknesses across trust boundaries, attacker-controlled inputs, identities, secrets, data, and operational controls. Review is read-only.

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

Keep vulnerabilities in an existing `docs/agent/findings.md`; otherwise report sanitized findings in the final response. Log only accepted security tradeoffs, threat-model assumptions, compensating controls, or risk acceptance decisions.
Use an existing `docs/agent/decision-log.md`. If it is absent, include the decision in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate immediately for plausible critical exposure, active compromise indicators, secrets in version control, testing that may affect real users, or remediation requiring risk acceptance. Avoid broadcasting sensitive details beyond the authorized audience.
