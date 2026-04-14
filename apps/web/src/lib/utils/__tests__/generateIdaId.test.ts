import { test } from 'node:test';
import assert from 'node:assert';
import { generateIdaId } from '../generateIdaId.ts';

test('generateIdaId', async (t) => {
  await t.test('generates valid UUID with IDA prefix', () => {
    const id = generateIdaId();
    assert.strictEqual(id.startsWith('IDA-'), true);
    // UUID regex check (v4 or general format)
    const uuidPart = id.substring(4);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.strictEqual(uuidRegex.test(uuidPart), true);
  });
});
