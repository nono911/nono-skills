import assert from 'node:assert/strict';

export const workspaceSection = `## Workspace protocol

Read \`../../references/workspaces.md\` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.`;

export const expectedDurableEndings = Object.freeze({
  'api-design': "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.",
  'architecture-review': "When durable state is approved, append structural tradeoffs or accepted architecture risk to the selected work item's decisions.md and track actionable defects in findings.md; otherwise report them in the final response.",
  brainstorm: "When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.",
  'database-design': "When durable state is approved, append invariant, consistency, migration, and operational choices to the selected work item's decisions.md; otherwise include them in the final response.",
  debug: "When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; otherwise include them in the final response.",
  estimate: "When durable state is approved, append scope interpretations, estimation model changes, and accepted schedule tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.",
  'fix-findings': "When durable state is approved, update the selected work item's findings.md with status and verification evidence, and append material remediation tradeoffs to decisions.md; otherwise report state changes and decisions in the final response.",
  implement: "When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.",
  migration: "When durable state is approved, append compatibility, sequencing, rollback, and point-of-no-return choices to the selected work item's decisions.md; otherwise include them in the final response.",
  plan: "When durable state is approved, append the decision to the selected work item's `decisions.md`; otherwise include it in the final response.",
  refactor: "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.",
  'release-readiness': "When durable state is approved, append only accepted release risk, waivers, rollback choices, and readiness-scope decisions to the selected work item's decisions.md; otherwise include them in the final response.",
  review: "When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.",
  'security-review': "When durable state is approved, track sanitized vulnerabilities in the selected work item's findings.md and append accepted security tradeoffs, threat assumptions, compensating controls, or risk acceptance to decisions.md; otherwise report them in the final response.",
  test: "When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; otherwise include them in the final response.",
});

const legacySingletonReference = /docs\/agent\/(?:spec|plan|decision-log|findings|handoff)\.md|(?:^|[^A-Za-z0-9_/-])decision-log\.md(?=$|[^A-Za-z0-9_-])|\b(?:existing|global|singleton)\s+`?(?:spec|plan|findings|handoff)\.md`?/im;

function markdownSections(content) {
  return [...content.matchAll(/^## ([^\n]+)$/gm)].map((match) => ({
    name: match[1],
    start: match.index,
  }));
}

function sectionText(content, sections, index) {
  const end = sections[index + 1]?.start ?? content.length;
  return content.slice(sections[index].start, end).trimEnd();
}

export function assertSkillWorkspaceContract(name, content) {
  const expectedEnding = expectedDurableEndings[name];
  assert.ok(expectedEnding, `${name} must be in the expected skill inventory`);

  const sections = markdownSections(content);
  const purposeIndex = sections.findIndex((section) => section.name === 'Purpose');
  assert.notEqual(purposeIndex, -1, `${name} must define a Purpose section`);
  assert.equal(
    sections[purposeIndex + 1]?.name,
    'Workspace protocol',
    `${name} must place the Workspace protocol section immediately after Purpose`,
  );

  const workspaceSections = sections.filter((section) => section.name === 'Workspace protocol');
  assert.equal(workspaceSections.length, 1, `${name} must define exactly one Workspace protocol section`);
  assert.equal(
    sectionText(content, sections, purposeIndex + 1),
    workspaceSection,
    `${name} must use the exact Workspace protocol section`,
  );

  const decisionIndex = sections.findIndex((section) => section.name === 'Decision-log updates');
  assert.notEqual(decisionIndex, -1, `${name} must define a Decision-log updates section`);
  const decisionLines = sectionText(content, sections, decisionIndex).split('\n');
  assert.equal(
    decisionLines.at(-1),
    expectedEnding,
    `${name} must end Decision-log updates with its durable-state contract`,
  );

  assert.doesNotMatch(
    content,
    legacySingletonReference,
    `${name} must not reference legacy singleton workflow artifacts`,
  );
}
