'use client';

import { useEffect } from 'react';

import { InteractiveErrorState } from '@auibsal/ui/components/InteractiveErrorState';

import { ubuntu, ubuntuArabic } from '@/fonts';

import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  // CRITICAL: Extract the Next.js error digest for telemetry
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Fire the critical error into the Vercel edge logs
    console.error('Nexus Global Kernel Panic:', error, 'Digest:', error.digest);
  }, [error]);

  const errorHash = error.digest ? `[Exception Hash: ${error.digest}]` : '[Uncaught System Fault]';

  const handleHardReboot = () => {
    // A root layout crash corrupts the React tree. Force a hard browser reload instead of a soft reset.
    window.location.reload();
  };

  return (
    // Parity with layout.tsx: Suppress hydration warnings
    <html
      lang="en"
      className={`${ubuntu.variable} ${ubuntuArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <InteractiveErrorState
          code="SYS_HALT"
          title="Kernel Panic"
          message={`The root layout execution has critically failed. The rendering engine is offline. ${errorHash}`}
          actionText="> Execute Hard Reboot"
          onAction={handleHardReboot}
          isRtl={false}
        />
      </body>
    </html>
  );
}
