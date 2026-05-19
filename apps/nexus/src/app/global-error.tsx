'use client';
import { InteractiveErrorState } from '@auibsal/ui';
import './globals.css'; 

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
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
