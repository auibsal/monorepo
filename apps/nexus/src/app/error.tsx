'use client';
import { useEffect } from 'react';
import { InteractiveErrorState } from '@auibsal/ui';

export default function NexusError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Nexus Runtime Error:', error);
  }, [error]);

  return (
    <InteractiveErrorState 
      code="ERR_500"
      title="Fatal Exception"
      message={`System thread has crashed. Memory allocation failed. Runtime Error: ${error.message || 'Uncaught Exception'}.`}
      actionText="Initialize Hard Reboot"
      onAction={() => reset()}
      isRtl={false}
    />
  );
}
