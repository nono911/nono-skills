# UI guide coverage and capture

Read this reference only when a guide covers a rendered interface, multiple features, or many user actions.

## Survey the product autonomously

Do not ask the user to enumerate features, routes, controls, roles, or viewports that can be discovered safely.

1. Inspect repository instructions, workspace boundaries, package scripts, app entry points, route declarations, navigation, permission guards, tests, seed data, configured devices, and responsive rules. Treat source as discovery evidence, not proof that a user can complete an action.
2. Prefer an explicitly supplied target. Otherwise reuse a running local target associated with the repository or start the relevant app with its documented non-destructive development command. Never select or mutate a production-looking target merely because its URL appears in configuration.
3. Inspect the rendered page, accessibility tree, and visible DOM together. Inventory visible enabled links, buttons, menu items, tabs, form controls, dialogs, and their accessible names, states, destinations, and role conditions. Ignore hidden templates and framework internals.
4. Traverse safe navigation, tabs, menus, expansion controls, dialogs, sorting, filtering, and non-sensitive search automatically. Use synthetic input. Do not submit mutations, upload files, export data, purchase, message externally, change authentication or permissions, or trigger destructive or ambiguous actions without matching authority.
5. Reconcile the rendered inventory with source routes, conditional navigation, tests, and role guards. Mark inaccessible, role-gated, or unsafe actions instead of guessing. Treat repeated record-detail routes as one pattern unless behavior differs materially.
6. Stop after navigation and route reconciliation yield no new in-scope outcomes. Do not crawl external origins or generate unbounded combinations of records, filters, or query parameters.

Use `OBSERVED` when an element or state was rendered, `VERIFIED` only when its required interaction and result were exercised, `UNVERIFIED` when evidence is indirect or partial, and `BLOCKED` when access, environment, role, safety, or tooling prevents a verdict. If no runnable target is safe or available, continue from repository evidence and label every runtime claim accordingly instead of making the user reconstruct the site for you.

## Organize coverage around outcomes

- Split documentation by audience and user outcome, not by every screen or control. Use a small overview or index to route readers to focused task guides instead of building one giant manual.
- Keep each task guide independently useful: goal, prerequisites, material steps, expected result, warnings, and troubleshooting only where needed.
- Build a compact working map: `feature -> user outcome -> material action -> guide section -> capture -> verification status`. Every in-scope outcome must be covered, linked to canonical guidance, or explicitly excluded.
- Explain actions that mutate data or state, change permissions, spend money, communicate externally, cross a workflow boundary, disclose data, or have ambiguous or irreversible consequences. Omit ordinary navigation, dismissal, and self-evident controls unless their behavior is unusual.
- When one surface has many controls, prefer one contextual capture with unobtrusive numbered callouts plus a short action table. Add separate captures only for materially different states or branches.

## Select a representative viewport

There is no universal screenshot size. Select in this order:

1. Use the viewport, device, orientation, locale, theme, and browser explicitly required by the user or product support matrix.
2. Otherwise inspect design files, end-to-end test projects, configured devices, CSS media or container queries, and documented breakpoints. Authorized analytics may inform which supported ranges matter; never access analytics merely to write a guide.
3. Exercise the page across widths and select one width comfortably inside each materially different supported layout range. Do not capture exactly on a breakpoint unless the transition itself is under test.
4. If no project evidence exists, use `1440x900` desktop, `768x1024` tablet, and `390x844` mobile in CSS pixels as clearly disclosed fallbacks. Do not force all three onto a desktop-only or mobile-only product.

Record viewport width and height in CSS pixels. When tooling supports it, capture at CSS scale (for example Playwright `scale: "css"`) so one image pixel represents one CSS pixel and high-DPI emulation does not create unnecessarily large files. Keep browser zoom at 100% unless zoom behavior is the subject of the guide.

## Capture and embed

- Use the page viewport rather than the operating-system desktop or browser chrome. Keep browser, zoom, locale, theme, fixtures, and viewport consistent within a guide unless a variation is intentional.
- Wait for fonts, loading states, and relevant animations to settle. Capture after the action reaches the state the guide claims.
- Default to the visible viewport or a focused region. Use a full-page capture only when the whole-page relationship matters and remains legible.
- Preserve enough context to orient the reader: page title or breadcrumb, the relevant control, and the resulting state. Crop irrelevant space without hiding warnings, permission context, or consequences.
- Prefer safe synthetic fixtures and nonproduction accounts. Remove secrets and personal or customer data before capture; if redaction is unavoidable, make it irreversible and inspect the final asset.
- Use stable names such as `invite-member--desktop-1440x900.png` under the repository's established asset directory, or `docs/assets/<guide-slug>/` when none exists.
- Embed with a relative path, meaningful alt text, and a short caption containing the target version or environment and viewport when that context affects accuracy. Do not upscale a bitmap; let the documentation renderer scale it down responsively.
- Reuse an existing image only after confirming it still matches the current product. Mockups and illustrative images must be labeled as such and never count as runtime verification.

A capture proves only the visible state it contains. Keep the related journey `UNVERIFIED` or `BLOCKED` when the required interaction, role, environment, or result was not actually exercised.
