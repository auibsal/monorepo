'use client';

// 1. Synchronized with the named export standard of the UI package
import { InteractiveErrorState } from '@auibsal/ui/components/InteractiveErrorState';
import { ubuntu, ubuntuArabic } from '@/fonts';

import './globals.css'; // Path adjusted for the root app directory

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    // Re-injecting the AUIB font variables directly into the fallback HTML
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      {/* Re-injecting the semantic dark-mode compatible background tokens */}
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <InteractiveErrorState
          code="SYS_CRITICAL"
          title="Total Collapse"
          message="The fundamental architecture of this environment has failed to initialize."
          actionText="Force Reboot"
          onAction={() => reset()}
          // Hardcoding LTR here is mathematically correct, as next-intl has fundamentally failed at this boundary
          isRtl={false}
        />
      </body>
    </html>
  );
}
