function caseFold(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('en-US');
}

function normalizePositive(value) {
  return caseFold(value)
    .replace(/(?<=\p{L})\p{Dash_Punctuation}+(?=\p{L})/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function outputAssertionFailures(contract, output) {
  const failures = [];
  const normalized = normalizePositive(output);
  for (const text of contract.contains_all ?? []) {
    if (!normalized.includes(normalizePositive(text))) {
      failures.push(`output missing: ${JSON.stringify(text)}`);
    }
  }
  if (contract.contains_any && !contract.contains_any.some(
    (text) => normalized.includes(normalizePositive(text)),
  )) {
    failures.push(`output missing any of: ${contract.contains_any.map(JSON.stringify).join(', ')}`);
  }

  const exact = caseFold(output);
  for (const text of contract.not_contains ?? []) {
    if (exact.includes(caseFold(text))) {
      failures.push(`output contains forbidden text: ${JSON.stringify(text)}`);
    }
  }
  return failures;
}
