import assert from 'node:assert/strict';
import test from 'node:test';

import { parseItems, parseRetryCount } from '../src/parser.js';

test('parseItems trims item text', () => {
  assert.deepEqual(parseItems({ items: [' one ', 'two'] }), ['one', 'two']);
});

test('parseRetryCount preserves zero and defaults only undefined', () => {
  assert.equal(parseRetryCount(0), 0);
  assert.equal(parseRetryCount(undefined), 3);
});
