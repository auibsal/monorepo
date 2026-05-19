'use client';
import InteractiveError from './InteractiveError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <InteractiveError error={error} reset={reset} />;
}
