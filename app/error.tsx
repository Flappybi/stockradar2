"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="error-view panel">
      <h1>Something interrupted this view.</h1>
      <p>The research page could not be loaded. Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
