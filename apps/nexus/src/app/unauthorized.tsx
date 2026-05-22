'use client';
import { useRouter } from 'next/navigation';
import InteractiveErrorState from '@auibsal/ui/components/InteractiveErrorState';

export default function NexusUnauthorized() {
  const router = useRouter();

  return (
    <InteractiveErrorState 
      code="401_UNAUTHORIZED"
      title="Access Denied"
      message="Cryptographic signature missing. You must supply valid authentication credentials to interact with this module."
      actionText="> Execute /Login"
      onAction={() => router.push('/login')}
      isRtl={false}
    />
  );
}
