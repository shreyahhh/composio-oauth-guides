export type PipelineStepName =
  | "resolve"
  | "research"
  | "composio_check"
  | "draft"
  | "critic"
  | "save";

export type PipelineEvent =
  | { type: "step_start"; step: PipelineStepName; label: string }
  | { type: "step_done"; step: PipelineStepName; label: string; detail?: string }
  | { type: "step_warning"; step: PipelineStepName; label: string; detail: string }
  | { type: "error"; message: string }
  | { type: "done"; slug: string };

export type ResolvedApp = {
  appName: string;
  appUrl?: string;
  developerPortalUrl?: string;
  providerDocsUrl?: string;
};

export type ResearchSource = { url: string; title?: string };

export type ResearchResult = {
  narrative: string;
  sources: ResearchSource[];
};
