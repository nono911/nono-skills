export function parseItems(input) {
  return input.items.map((item) => String(item).trim());
}

export function parseRetryCount(value) {
  if (value === undefined) return 3;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error('retry count must be a non-negative integer');
  return parsed;
}
