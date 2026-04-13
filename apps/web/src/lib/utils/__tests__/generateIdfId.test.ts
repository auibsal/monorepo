import { test } from 'node:test';
import assert from 'node:assert';
import { generateIdfId } from '../generateIdfId.ts';

test('generateIdfId', async (t) => {
  await t.test('handles zero', () => {
    assert.strictEqual(generateIdfId(0), 'IDF-000001');
  });

  await t.test('handles single digit', () => {
    assert.strictEqual(generateIdfId(9), 'IDF-000010');
  });

  await t.test('handles double digits', () => {
    assert.strictEqual(generateIdfId(99), 'IDF-000100');
  });

  await t.test('handles 5 digits', () => {
    assert.strictEqual(generateIdfId(99998), 'IDF-099999');
  });

  await t.test('handles boundary to 6 digits', () => {
    assert.strictEqual(generateIdfId(99999), 'IDF-100000');
  });

  await t.test('handles 6 digits and beyond', () => {
    assert.strictEqual(generateIdfId(999999), 'IDF-1000000');
  });
});
