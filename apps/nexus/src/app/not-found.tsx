'use client';

import { useRouter } from 'next/navigation';

import { InteractiveErrorState } from '@auibsal/ui';

export default function NexusNotFound() {
  const router = useRouter();

  return (
    <InteractiveErrorState
      code="ERR_404"
      title="Directory Terminated"
      message="The requested module coordinate is unregistered in the current active database schema. Access is mathematically impossible."
      actionText="> Execute /Return_To_Base"
      onAction={() => router.push('/')}
      isRtl={false}
    />
  );
}
