# Guide output formats and pagination

Read this reference when creating a file, exporting a guide, or changing an established documentation format.

## Select the source and outputs

1. Preserve the repository's canonical documentation system and conventions when they exist, including its source format, navigation, components, asset layout, build, and lint commands.
2. Otherwise use Markdown or MDX as canonical source under `docs/guides/<guide-slug>/`, with images in the established asset directory or a nearby `assets/` directory. Keep links relative and portable.
3. Build HTML or a documentation site from canonical source rather than maintaining a second hand-edited copy.
4. Create PDF only when requested or clearly required for offline or fixed-layout delivery. Keep it as a reproducible derivative, never the only editable source.
5. Create DOCX only when an editable Word handoff is requested. Render it for visual QA before delivery.
6. Publishing to a help center, CMS, wiki, or website requires scoped authority and a capable connector. Otherwise provide local or copyable artifacts only.

If the requested renderer is unavailable, still produce the canonical source when useful, mark the export `BLOCKED`, and name the missing capability. Do not add a heavy dependency, redesign the documentation stack, or publish externally merely to create an export.

## Verify source-based documentation

- Run the repository's focused documentation build, link check, lint, or asset validation when available.
- Check headings, anchors, relative links, image paths, alt text, code wrapping, callouts, and navigation in the rendered output. Source text alone does not prove layout.
- Derive paper size, orientation, margins, locale, typography, header, and footer from user requirements or repository conventions. When none exists, choose and disclose a reasonable local standard such as A4 portrait; do not imply that the fallback is a product requirement.

## Control pagination

- Keep a heading with the first meaningful paragraph, list item, or block that follows it. Avoid orphan headings at a page bottom and single trailing lines at the top or bottom of a page.
- Keep each screenshot or figure with its caption and, when practical, the action or explanation it proves. Scale it inside the printable content box without clipping, distortion, or unreadable UI text.
- Avoid splitting short task steps, callouts, warnings, code blocks, examples, and table rows. Repeat table headers on continued pages.
- Allow long tables, code blocks, or sections to split when keeping them whole would overflow or create excessive blank space. Do not apply `break-inside: avoid` indiscriminately.
- Start top-level sections on new pages only when the convention is consistent and does not create wasteful or unexplained blank pages.
- Keep page numbers, headers, footers, footnotes, and margins clear of body content. Use renderer-native page-break controls or print CSS, never repeated blank lines.
- Preserve searchable, selectable text unless an image-only deliverable is explicitly required.

## Render, inspect, and revise

For PDF or another paginated deliverable, completion requires this loop after the latest meaningful change:

1. Export the document and inspect its page count and metadata.
2. Render every page to images. A contact sheet may speed the first pass, but inspect suspicious or dense pages at full resolution.
3. Check every page for clipped, overlapping, missing, or unreadable content; orphan headings; split figures and captions; broken tables or code; inconsistent margins; blank pages; and incorrect headers, footers, or page numbers.
4. Fix the canonical source, template, or print CSS and regenerate. Repeat until the latest render has no material visual or pagination defect.
5. Reopen the final artifact, confirm the expected page count and searchable text, and rerun applicable link or asset checks.

Report the canonical source, delivered derivatives, page count, paper size, checks performed, and any residual limitation. Never claim a PDF or DOCX is verified from successful export alone.
