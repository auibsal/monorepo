'use client';
import { InteractiveErrorState } from '@auibsal/ui';
import '../globals.css';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <InteractiveErrorState 
          code="SYS_CRITICAL"
          title="Total Collapse"
          message="The fundamental architecture of this environment has failed to initialize."
          actionText="Force Reboot"
          onAction={() => reset()}
          isRtl={false}
        />
      </body>
    </html>
  );
}
