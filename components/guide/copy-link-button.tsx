"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/guides/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (e.g. insecure context) -- fail silently, link is still visible in the address bar
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
