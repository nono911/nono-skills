# Human-readable work items

Read this reference only when the primary output is an epic, story, issue, ticket, task, subtask, milestone, or an equivalent project-management record.

## Normalize before mapping

Build the smallest useful content model from facts already supplied or safely discoverable:

- **Title:** name the observable outcome, not the implementation activity.
- **Outcome and context:** explain who benefits, what changes, and why it matters.
- **Scope:** state in-scope and out-of-scope boundaries when omission could mislead execution.
- **Acceptance:** use testable observable criteria; preserve stable acceptance IDs when they exist.
- **Relationships:** identify parent, children, dependencies, and blockers without inventing hierarchy.
- **Evidence:** link specs, decisions, designs, incidents, commits, or verification instead of duplicating them.
- **Operations:** include owner, priority, estimate, labels, status, and due date only when known or explicitly requested.

Keep a small task short. Add sections only for fields that carry real information. A parent item summarizes shared context; child items contain their own independently verifiable outcome rather than repeating the parent body.

## Map at runtime

Use the active connector to inspect the target platform's terminology, required fields, hierarchy, status values, and relationship capabilities. Map the normalized content into native fields without hard-coding Jira, Linear, GitHub, Asana, or another provider's schema into this skill.

Preserve existing identifiers, links, status, authorship, and user-written content unless the requested change includes them. Never invent an assignee, deadline, priority, estimate, label, project, or parent to make a record look complete.

## Mutation boundary

- A scoped request to create or update identified work items authorizes only that mutation through an available connector.
- Ask before bulk creation, reassignment, destructive replacement, status transitions with workflow consequences, notifications, or changes outside the named scope.
- If no capable connector is available, return a copyable draft and clearly say that nothing was created or updated.
- After a connector call, report the actual result with the native item name, identifier, and link when available. Never imply success from a draft or attempted call.
