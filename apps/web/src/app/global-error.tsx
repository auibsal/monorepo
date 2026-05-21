'use client';

import { ubuntu, ubuntuArabic } from '@/fonts';

import { InteractiveErrorState } from '@auibsal/ui';

import './globals.css';

// Path adjusted for the root app directory

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    // Re-injecting the AUIB font variables directly into the fallback HTML
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      {/* Re-injecting the semantic dark-mode compatible background tokens */}
      <body className="bg-background text-foreground flex min-h-screen flex-col overflow-x-hidden font-sans antialiased">
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
