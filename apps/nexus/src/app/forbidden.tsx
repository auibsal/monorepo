'use client';
import { useRouter } from 'next/navigation';

import { InteractiveErrorState } from '@auibsal/ui/components/InteractiveErrorState';

export default function NexusForbidden() {
  const router = useRouter();

  return (
    <InteractiveErrorState
      code="403_RESTRICTED"
      title="Clearance Denied"
      message="Your current authentication tier lacks the necessary system privileges to execute this directive."
      actionText="> Return to Dashboard"
      onAction={() => router.push('/')}
      isRtl={false}
    />
  );
}
