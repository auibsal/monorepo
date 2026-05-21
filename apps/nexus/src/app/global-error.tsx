'use client';

import { InteractiveErrorState } from '@auibsal/ui';
import { ubuntu, ubuntuArabic } from '@/fonts';
import './globals.css'; 

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    // Re-injecting the AUIB font variables directly into the fallback HTML
    <html lang="en" className={`${ubuntu.variable} ${ubuntuArabic.variable}`}>
      {/* Re-injecting the semantic dark-mode compatible background tokens */}
      <body className="font-sans antialiased min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
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
