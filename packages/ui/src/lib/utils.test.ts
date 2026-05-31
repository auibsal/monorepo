import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('concatenates strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn('foo', isTrue && 'bar', isFalse && 'baz')).toBe('foo bar');
    expect(cn('foo', null, undefined, 'bar')).toBe('foo bar');
  });

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles nested arrays and objects', () => {
    expect(cn(['foo', ['bar', { baz: true }]])).toBe('foo bar baz');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles complex tailwind conflicts', () => {
    expect(cn('p-4', 'pt-2')).toBe('p-4 pt-2');
    expect(cn('pt-2', 'p-4')).toBe('p-4');
  });
});
