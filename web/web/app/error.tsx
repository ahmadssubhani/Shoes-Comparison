"use client";

import { ErrorRetry } from "@/components/UiStates";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ErrorRetry message={error.message} reset={reset} />
    </div>
  );
}
