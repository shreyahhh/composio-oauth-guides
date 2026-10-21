"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  PipelineStepper,
  PipelineProgressHeader,
  initialStepStatus,
  type StepKey,
  type StepStatusMap,
} from "./pipeline-stepper";

type StreamedEvent =
  | { type: "cached"; slug: string; updatedAt: string }
  | { type: "step_start"; step: StepKey; label: string }
  | { type: "step_done"; step: StepKey; label: string; detail?: string }
  | { type: "step_warning"; step: StepKey; label: string; detail: string }
  | { type: "error"; message: string }
  | { type: "done"; slug: string };

export function GenerateForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<StepStatusMap | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [cached, setCached] = useState<{ slug: string; updatedAt: string } | null>(null);

  async function run(force: boolean) {
    setRunning(true);
    setStatus(initialStepStatus());
    setFatalError(null);
    setCached(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, force }),
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
      setFatalError("Connection lost -- please try again.");
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
      setStatus((prev) => (prev ? { ...prev, [event.step]: { state: "running" } } : prev));
      return;
    }
    if (event.type === "step_done") {
      setStatus((prev) => (prev ? { ...prev, [event.step]: { state: "done", detail: event.detail } } : prev));
      return;
    }
    if (event.type === "step_warning") {
      setStatus((prev) => (prev ? { ...prev, [event.step]: { state: "warning", detail: event.detail } } : prev));
      return;
    }
    if (event.type === "error") {
      setRunning(false);
      setStatus((prev) => {
        if (!prev) return prev;
        const runningKey = (Object.keys(prev) as StepKey[]).find((k) => prev[k].state === "running");
        if (!runningKey) {
          setFatalError(event.message);
          return prev;
        }
        return { ...prev, [runningKey]: { state: "error", detail: event.message } };
      });
      return;
    }
    if (event.type === "done") {
      setRunning(false);
      router.push(`/guides/${event.slug}`);
    }
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
          <Sparkles className="size-4" />
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

      {fatalError && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{fatalError}</AlertDescription>
        </Alert>
      )}

      {status && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <PipelineProgressHeader status={status} />
            <Separator />
            <PipelineStepper status={status} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
