"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isConfigError = error.message.includes("is not set");

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>{isConfigError ? "Not configured yet" : "Something went wrong"}</AlertTitle>
        <AlertDescription>
          {isConfigError
            ? error.message
            : "An unexpected error occurred. If this is the live pipeline, it may be a free-tier rate limit -- try again shortly."}
        </AlertDescription>
      </Alert>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
