'use client';

import { ubuntu, ubuntuArabic } from '@/fonts';

import { InteractiveErrorState } from '@auibsal/ui';

import './globals.css';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    // Re-injecting the AUIB font variables directly into the fallback HTML
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      {/* Re-injecting the semantic dark-mode compatible background tokens */}
      <body className="bg-background text-foreground flex min-h-screen flex-col overflow-x-hidden font-sans antialiased">
        <InteractiveErrorState
          code="SYS_HALT"
          title="Kernel Panic"
          message="The root layout execution has critically failed. The database connection or rendering engine is offline."
          actionText="Flush Cache & Restart"
          onAction={() => reset()}
          isRtl={false}
        />
      </body>
    </html>
  );
}
