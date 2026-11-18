---
name: ui-design
description: Use when designing a user-facing screen, implementing visible layout or controls, or correcting visual imbalance in a rendered interface. Not for backend-only work or functional QA alone.
---

# UI Design

## Purpose

Make the primary task clear at a glance and make related elements feel like they belong together. Match the product, not a preferred visual style.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

The user's task, affected screen and states, approved design if supplied, and the closest existing product pattern. Use realistic content and the project's own controls and tokens.

## Outputs

For design advice, give a scoped recommendation without editing. For authorized implementation, deliver the adjusted UI and briefly identify what rendered surface, size and state you inspected, what you corrected, and any unverified condition.

## Rules

- On a new screen, choose the arrangement around what the user needs to compare, find or explore. If a slogan, hero or repeated status badge pushes that information down without helping the decision, omit it. Cards and imagery are useful when they serve the task.
- On an existing screen, keep the product's visual language and any approved design. If everything competes for attention, try reducing secondary emphasis before introducing another style. A local fix need not reopen the page design.
- Open the actual changed screen in the available browser, simulator or app preview and inspect its rendered image. Start at page scale: follow the reading order, grouping, alignment, whitespace and visual weight. Give content the space its job requires; balance does not mean equal columns.
- Inspect the affected cluster closely: compare control edges, text baselines, perceived heights and gaps. Correct accidental differences, not deliberate hierarchy.
- For a dropdown, inspect two gaps on the rendered control: the longest realistic label to the nearest visible chevron stroke, and the outermost painted tip to the trailing border. Ignore transparent space inside the SVG box when judging either gap. Compare the latter with the leading text inset and neighboring controls; keep it optically balanced even for a short label. Text padding alone may not move a native indicator. Prefer the project's select pattern, preserve keyboard and focus behavior, and recheck at the same width after adjusting.
- Inspect the state and width most likely to break the composition. Preserve usable targets and visible focus. When changing an interaction, operate the control through its changed state (for example, select a long value by keyboard and check where focus lands). A spacing-only fix does not need a full journey test.
- During implementation, fix observed in-scope imbalance without waiting for another request, then render the affected view again. Stop when the concrete issue is resolved; do not redesign neighboring screens or repeat unchanged checks. Reuse the same evidence for acceptance where applicable.
- CSS measurements, DOM assertions and passing functional tests do not establish visual balance. If rendering is unavailable, name the missing view and do not claim it was visually verified. A screenshot alone is not evidence of task usability.

## Decision-log updates

When durable state is approved, append material visual tradeoffs or unresolved design decisions to the selected work item's decisions.md; otherwise report them in the final response.

## Escalate to the human

Ask when a correction changes the approved design, primary task or product behavior. Routine spacing, alignment and optical corrections within the agreed direction do not need approval.
