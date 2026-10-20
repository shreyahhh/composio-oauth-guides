"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Line =
  | { kind: "step"; label: string; status: "running" | "done" | "warning" }
  | { kind: "error"; message: string };

type StreamedEvent =
  | { type: "cached"; slug: string; updatedAt: string }
  | { type: "step_start"; step: string; label: string }
  | { type: "step_done"; step: string; label: string; detail?: string }
  | { type: "step_warning"; step: string; label: string; detail: string }
  | { type: "error"; message: string }
  | { type: "done"; slug: string };

export function GenerateForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [cached, setCached] = useState<{ slug: string; updatedAt: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run(force: boolean) {
    setRunning(true);
    setLines([]);
    setCached(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, force }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const event: StreamedEvent = JSON.parse(part);
          handleEvent(event);
        }
      }
    } catch {
      setLines((prev) => [...prev, { kind: "error", message: "Connection lost -- please try again." }]);
      setRunning(false);
    }
  }

  function handleEvent(event: StreamedEvent) {
    if (event.type === "cached") {
      setCached({ slug: event.slug, updatedAt: event.updatedAt });
      setRunning(false);
      return;
    }
    if (event.type === "step_start") {
      setLines((prev) => [...prev, { kind: "step", label: event.label, status: "running" }]);
      return;
    }
    if (event.type === "step_done") {
      setLines((prev) => updateLastRunning(prev, event.label, "done"));
      return;
    }
    if (event.type === "step_warning") {
      setLines((prev) => updateLastRunning(prev, `${event.label} -- ${event.detail}`, "warning"));
      return;
    }
    if (event.type === "error") {
      setLines((prev) => [...prev, { kind: "error", message: event.message }]);
      setRunning(false);
      return;
    }
    if (event.type === "done") {
      setRunning(false);
      router.push(`/guides/${event.slug}`);
    }
  }

  function updateLastRunning(prev: Line[], label: string, status: "done" | "warning"): Line[] {
    const next = [...prev];
    for (let i = next.length - 1; i >= 0; i--) {
      const line = next[i];
      if (line.kind === "step" && line.status === "running") {
        next[i] = { kind: "step", label, status };
        break;
      }
    }
    return next;
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !running) run(false);
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="App name or URL, e.g. 'Asana' or https://asana.com"
          disabled={running}
        />
        <Button type="submit" disabled={running || !input.trim()}>
          {running ? "Generating..." : "Generate guide"}
        </Button>
      </form>

      {cached && (
        <Alert>
          <AlertTitle>Already generated</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Generated on {new Date(cached.updatedAt).toLocaleDateString()}.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push(`/guides/${cached.slug}`)}>
                View guide
              </Button>
              <Button size="sm" variant="secondary" onClick={() => run(true)}>
                Regenerate
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {lines.length > 0 && (
        <ul className="space-y-1 rounded-lg border p-3 text-sm">
          {lines.map((line, i) =>
            line.kind === "error" ? (
              <li key={i} className="text-destructive">
                {line.message}
              </li>
            ) : (
              <li key={i} className="flex items-center gap-2">
                <span aria-hidden>{line.status === "running" ? "⏳" : line.status === "warning" ? "⚠️" : "✅"}</span>
                <span className={line.status === "warning" ? "text-amber-600" : ""}>{line.label}</span>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
