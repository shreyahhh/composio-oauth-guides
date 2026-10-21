import { Search, Globe, Link2, FileText, ShieldCheck, Database, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export type StepKey = "resolve" | "research" | "composio_check" | "draft" | "critic" | "save";
export type StepState = "pending" | "running" | "done" | "warning" | "error";

export const STEP_ORDER: StepKey[] = ["resolve", "research", "composio_check", "draft", "critic", "save"];

const STEP_META: Record<StepKey, { title: string; blurb: string; icon: ComponentType<{ className?: string }> }> = {
  resolve: { title: "Resolve", blurb: "Find the provider and its docs", icon: Search },
  research: { title: "Research", blurb: "Read docs and search the web", icon: Globe },
  composio_check: { title: "Composio check", blurb: "Look up managed auth", icon: Link2 },
  draft: { title: "Draft", blurb: "Fill out the guide schema", icon: FileText },
  critic: { title: "Critic", blurb: "Verify every claim has a source", icon: ShieldCheck },
  save: { title: "Save", blurb: "Write the guide, get a link", icon: Database },
};

export type StepStatus = { state: StepState; detail?: string };
export type StepStatusMap = Record<StepKey, StepStatus>;

export function initialStepStatus(): StepStatusMap {
  return STEP_ORDER.reduce((acc, key) => {
    acc[key] = { state: "pending" };
    return acc;
  }, {} as StepStatusMap);
}

const SETTLED: StepState[] = ["done", "warning", "error"];

/** 0-100. A running step counts as half-credit so the bar visibly moves
 * mid-step rather than jumping only on completion. */
export function progressPercent(status: StepStatusMap): number {
  const settled = STEP_ORDER.filter((k) => SETTLED.includes(status[k].state)).length;
  const running = STEP_ORDER.some((k) => status[k].state === "running") ? 0.5 : 0;
  return Math.round((Math.min(STEP_ORDER.length, settled + running) / STEP_ORDER.length) * 100);
}

/** Index of the step currently running, or the last one that settled, or -1 if nothing has started. */
export function currentStepIndex(status: StepStatusMap): number {
  const runningIdx = STEP_ORDER.findIndex((k) => status[k].state === "running");
  if (runningIdx !== -1) return runningIdx;
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
    if (SETTLED.includes(status[STEP_ORDER[i]].state)) return i;
  }
  return -1;
}

export function PipelineProgressHeader({ status }: { status: StepStatusMap }) {
  const idx = currentStepIndex(status);
  const pct = progressPercent(status);
  const hasError = STEP_ORDER.some((k) => status[k].state === "error");
  const allSettledOk = STEP_ORDER.every((k) => status[k].state === "done" || status[k].state === "warning");

  let label: string;
  if (hasError) label = "Stopped";
  else if (allSettledOk) label = "Done";
  else if (idx === -1) label = "Starting...";
  else label = `Step ${idx + 1} of ${STEP_ORDER.length}: ${STEP_META[STEP_ORDER[idx]].title}`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

const STATE_RING: Record<StepState, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  running: "border-primary bg-primary/10 text-primary",
  done: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const STATE_DETAIL_CLASS: Record<StepState, string> = {
  pending: "text-muted-foreground",
  running: "text-foreground",
  done: "text-muted-foreground",
  warning: "text-amber-700 dark:text-amber-400",
  error: "text-rose-700 dark:text-rose-400",
};

function StepIcon({ state, StepGlyph }: { state: StepState; StepGlyph: ComponentType<{ className?: string }> }) {
  if (state === "running") return <Loader2 className="size-4 animate-spin" />;
  if (state === "done") return <CheckCircle2 className="size-4" />;
  if (state === "warning") return <AlertTriangle className="size-4" />;
  if (state === "error") return <XCircle className="size-4" />;
  return <StepGlyph className="size-4" />;
}

export function PipelineStepper({ status }: { status: StepStatusMap }) {
  return (
    <ol className="space-y-0">
      {STEP_ORDER.map((key, i) => {
        const { title, blurb, icon: StepGlyph } = STEP_META[key];
        const { state, detail } = status[key];
        const isLast = i === STEP_ORDER.length - 1;

        return (
          <li
            key={key}
            className={cn(
              "flex gap-3 rounded-lg px-2 -mx-2 transition-colors",
              state === "running" && "bg-primary/5"
            )}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  state === "running" && "ring-4 ring-primary/10",
                  STATE_RING[state]
                )}
              >
                <StepIcon state={state} StepGlyph={StepGlyph} />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-6 transition-colors",
                    state === "done" || state === "warning" ? "bg-emerald-300 dark:bg-emerald-800" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", isLast && "pb-1")}>
              <div className="flex items-center gap-2 pt-1.5">
                <span className={cn("text-sm font-semibold", state === "pending" && "font-medium text-muted-foreground")}>
                  {title}
                </span>
                {state === "pending" && <span className="text-xs text-muted-foreground">{blurb}</span>}
              </div>
              {detail && <p className={cn("mt-0.5 text-sm", STATE_DETAIL_CLASS[state])}>{detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
