import { describe, it, expect } from 'vitest';
import { calculateWordCount } from './text';

describe('calculateWordCount', () => {
  it('should accurately count words ignoring HTML tags, markdown, and correctly counting Arabic text', () => {
    const text = '<p>Hello <b>world</b>!</p> *This* is a _test_ with Arabic: مرحبا بك';
    expect(calculateWordCount(text)).toBe(10);
  });

  it('returns 0 for empty input', () => {
    // @ts-expect-error Testing invalid input
    expect(calculateWordCount(null)).toBe(0);
    expect(calculateWordCount('')).toBe(0);
    expect(calculateWordCount('   ')).toBe(0);
  });
});
