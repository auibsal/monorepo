"use client";

import { ErrorState } from "@/components/error-state";

/** A failure inside this part of the site, in the page's language (audit A8). */
const PageError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => <ErrorState error={error} home="/account" reset={reset} />;

export default PageError;
