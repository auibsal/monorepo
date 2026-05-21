'use client';

import { useEffect } from 'react';

import { InteractiveErrorState } from '@auibsal/ui';

export default function NexusError({
  error,
  reset,
}: {
  // Strict Next.js typing to expose the error digest
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the digest alongside the error to match client logs to Vercel server logs
    console.error('Nexus Runtime Error:', error, 'Digest:', error.digest);
  }, [error]);

  // Construct a terminal-authentic error string using the production digest
  const errorHash = error.digest
    ? `[Exception Hash: ${error.digest}]`
    : '[Uncaught Kernel Exception]';

  return (
    <InteractiveErrorState
      code="ERR_500"
      title="Fatal Exception"
      message={`System thread has crashed. Memory allocation failed. ${errorHash}`}
      actionText="Initialize Hard Reboot"
      onAction={() => reset()}
      isRtl={false}
    />
  );
}
