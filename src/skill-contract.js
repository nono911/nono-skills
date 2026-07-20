import assert from 'node:assert/strict';

export const workspaceSection = `## Workspace protocol

Read \`../../references/workspaces.md\` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.`;

export const expectedDurableEndings = Object.freeze({
  'api-design': "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.",
  'architecture-review': "When durable state is approved, append structural tradeoffs or accepted architecture risk to the selected work item's decisions.md and track actionable defects in findings.md; otherwise report them in the final response.",
  brainstorm: "When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.",
  'database-design': "When durable state is approved, append invariant, consistency, migration, and operational choices to the selected work item's decisions.md; otherwise include them in the final response.",
  debug: "When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed debugging scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  estimate: "When durable state is approved, append scope interpretations, estimation model changes, and accepted schedule tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.",
  'fix-findings': "When durable state is approved, update the selected work item's findings.md with status and verification evidence, and append material remediation tradeoffs to decisions.md; otherwise report state changes and decisions in the final response.",
  implement: "When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.",
  migration: "When durable state is approved, append compatibility, sequencing, rollback, and point-of-no-return choices to the selected work item's decisions.md; otherwise include them in the final response.",
  plan: "When durable state is approved, append the decision to the selected work item's `decisions.md`; otherwise include it in the final response.",
  refactor: "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed refactoring scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  'release-readiness': "When durable state is approved, append only accepted release risk, waivers, rollback choices, and readiness-scope decisions to the selected work item's decisions.md; otherwise include them in the final response.",
  review: "When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.",
  'review-loop': "When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.",
  'security-review': "When durable state is approved, track sanitized vulnerabilities in the selected work item's findings.md and append accepted security tradeoffs, threat assumptions, compensating controls, or risk acceptance to decisions.md; otherwise report them in the final response.",
  test: "When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed testing scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
});

export const expectedRequiredResponsibilityLines = Object.freeze({
  'release-readiness': Object.freeze([
    '- For a selected work item, read its acceptance criteria, current plan state, findings, and verification evidence when available before judging readiness; reading this state neither authorizes release nor by itself requires artifact mutation.',
  ]),
  'review-loop': Object.freeze([
    '- Require explicit user authorization before creating either commit; invoking the skill without a commit request does not authorize commits.',
    '1. Use a fresh reviewer subagent for every round. Instruct it not to delegate or modify, stage, commit, or revert files; use a read-only sandbox when the client supports one, and verify the worktree is unchanged after review.',
    '5. Keep the original agent as the default fixer and orchestrator; delegate fixes only when they are independent, non-overlapping, and safe in the shared worktree.',
    '- Never push, deploy, or mutate external systems unless separately authorized.',
  ]),
});

const planDurableOutput = '- For approved durable work, updated `spec.md` and `plan.md` in the selected work-item directory';

export const allowedArtifactLines = Object.freeze(Object.fromEntries(
  Object.entries(expectedDurableEndings).map(([name, ending]) => [
    name,
    Object.freeze(name === 'plan' ? [ending, planDurableOutput] : [ending]),
  ]),
));

const workspaceBody = workspaceSection.slice(workspaceSection.indexOf('\n\n') + 2);
const legacySingletonReference = /\bdecision-log\.md\b|\bdocs\/agent\/(?:spec|plan|decisions|decision-log|findings|handoff)\.md\b/i;
const workflowArtifactReference = /\b(?:spec|plan|decisions|findings|handoff)\.md\b/i;

function openingFence(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!match || (match[1][0] === '`' && match[2].includes('`'))) return null;
  return { character: match[1][0], length: match[1].length };
}

function closesFence(line, fence) {
  const match = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
  return Boolean(
    match
      && match[1][0] === fence.character
      && match[1].length >= fence.length,
  );
}

function stripHtmlComments(line, commentOpen) {
  let cursor = 0;
  let text = '';
  let hadComment = commentOpen;

  while (cursor < line.length) {
    if (commentOpen) {
      const close = line.indexOf('-->', cursor);
      if (close === -1) return { commentOpen: true, hadComment: true, text };
      cursor = close + 3;
      commentOpen = false;
      hadComment = true;
    } else {
      const open = line.indexOf('<!--', cursor);
      if (open === -1) {
        text += line.slice(cursor);
        break;
      }
      text += line.slice(cursor, open);
      cursor = open + 4;
      commentOpen = true;
      hadComment = true;
    }
  }

  return { commentOpen, hadComment, text };
}

function authoritativeLines(content) {
  const sourceLines = content.split('\n');
  const lines = [];
  let fence = null;
  let htmlCommentOpen = false;
  let start = 0;

  for (let index = 0; index < sourceLines.length; index += 1) {
    const text = sourceLines[index];
    const hasLineEnding = index < sourceLines.length - 1;
    const end = start + text.length + (hasLineEnding ? 1 : 0);

    if (fence) {
      if (closesFence(text, fence)) fence = null;
    } else {
      const visible = stripHtmlComments(text, htmlCommentOpen);
      htmlCommentOpen = visible.commentOpen;
      if (!(visible.hadComment && visible.text.trim() === '')) {
        if (/^(?: {4}|\t)/.test(visible.text)) {
          start = end;
          continue;
        }
        const openedFence = openingFence(visible.text);
        if (openedFence) {
          fence = openedFence;
        } else {
          lines.push({
            text: visible.text,
            start,
            end,
          });
        }
      }
    }
    start = end;
  }

  return lines;
}

function normalizedLevelTwoHeading(line) {
  const match = line.match(/^ {0,3}##(?!#)(?:[ \t]+(.*))?[ \t]*$/);
  if (!match) return null;
  const name = (match[1] ?? '')
    .trimEnd()
    .replace(/[ \t]+#+$/, '')
    .trim();
  return name || null;
}

function markdownSections(lines) {
  const sections = [];
  for (const line of lines) {
    const name = normalizedLevelTwoHeading(line.text);
    if (name) sections.push({ name, start: line.start, bodyStart: line.end });
  }
  return sections;
}

function uniqueSectionIndex(name, sections, skillName) {
  const indexes = sections
    .map((section, index) => (section.name === name ? index : -1))
    .filter((index) => index !== -1);
  assert.equal(
    indexes.length,
    1,
    `${skillName} must define exactly one normalized ${name} section`,
  );
  return indexes[0];
}

function sectionBody(content, sections, index) {
  const end = sections[index + 1]?.start ?? content.length;
  return content.slice(sections[index].bodyStart, end);
}

function normalizeInlineMarkdown(text) {
  return text
    .replace(/!?\[([^\]\n]*)\]\(((?:\\.|[^\\)\n])*)\)/g, '$1 $2')
    .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1')
    .replace(/[`*_~]/g, '');
}

function assertArtifactLines(name, lines) {
  const allowedLines = allowedArtifactLines[name];
  const normalizedLines = lines.map(({ text }) => ({
    normalized: normalizeInlineMarkdown(text),
    text,
  }));

  for (const { normalized } of normalizedLines) {
    assert.doesNotMatch(
      normalized,
      legacySingletonReference,
      `${name} must not reference legacy singleton workflow artifacts`,
    );
  }

  for (const { normalized, text } of normalizedLines) {
    if (workflowArtifactReference.test(normalized)) {
      assert.ok(
        allowedLines.includes(text.trim()),
        `${name} must use only allowed authoritative workflow artifact lines`,
      );
    }
  }

  for (const allowedLine of allowedLines) {
    assert.equal(
      normalizedLines.filter(({ text }) => text.trim() === allowedLine).length,
      1,
      `${name} must include each allowed authoritative workflow artifact line exactly once`,
    );
  }
}

function assertRequiredResponsibilityLines(name, lines) {
  for (const requiredLine of expectedRequiredResponsibilityLines[name] ?? []) {
    assert.equal(
      lines.filter(({ text }) => text.trim() === requiredLine).length,
      1,
      `${name} must include each required responsibility line exactly once`,
    );
  }
}

function finalAuthoritativeSectionLine(lines, sections, index) {
  const start = sections[index].bodyStart;
  const end = sections[index + 1]?.start ?? Number.POSITIVE_INFINITY;
  return lines
    .filter((line) => line.start >= start && line.start < end && line.text.trim() !== '')
    .at(-1)?.text.trim();
}

export function assertSkillWorkspaceContract(name, content) {
  const expectedEnding = expectedDurableEndings[name];
  assert.ok(expectedEnding, `${name} must be in the expected skill inventory`);

  const lines = authoritativeLines(content);
  const sections = markdownSections(lines);
  const purposeIndex = uniqueSectionIndex('Purpose', sections, name);
  const workspaceIndex = uniqueSectionIndex('Workspace protocol', sections, name);
  const decisionIndex = uniqueSectionIndex('Decision-log updates', sections, name);
  assert.equal(
    workspaceIndex,
    purposeIndex + 1,
    `${name} must place the Workspace protocol section immediately after Purpose`,
  );
  assert.equal(
    sectionBody(content, sections, workspaceIndex).replace(/\n+$/, ''),
    `\n${workspaceBody}`,
    `${name} must use the exact Workspace protocol section`,
  );

  assert.equal(
    finalAuthoritativeSectionLine(lines, sections, decisionIndex),
    expectedEnding,
    `${name} must end Decision-log updates with its durable-state contract`,
  );

  assertArtifactLines(name, lines);
  assertRequiredResponsibilityLines(name, lines);
}
