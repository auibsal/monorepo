"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { getSupabase } from "@/lib/diwan/supabase";

interface AppProvidersProps {
  readonly children: ReactNode;
}

/** Data fetching, the Supabase session and the time of last use. */
export const AppProviders = ({ children }: AppProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      })
  );
  const [supabase] = useState(getSupabase);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={supabase}>{children}</AuthProvider>
      <FreshOnReturn />
    </QueryClientProvider>
  );
};

/**
 * Next keeps the last pages visited mounted but hidden (Cache Components'
 * Activity), so this layout's cache survives a visit to the public site.
 * When the pages are shown again, everything is read afresh: a place
 * booked on an event's page shows here, with its ticket, at once.
 */
const FreshOnReturn = () => {
  const queryClient = useQueryClient();
  const shown = useRef<boolean>(false);
  useEffect(() => {
    if (shown.current) {
      queryClient.invalidateQueries().catch(() => undefined);
    }
    shown.current = true;
  }, [queryClient]);
  return null;
};
