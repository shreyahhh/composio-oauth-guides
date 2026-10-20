import { Bot, Wand2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DifficultyTier, EvidenceLabel, StepOwner } from "@/lib/schema/guide";

const DIFFICULTY_LABEL: Record<DifficultyTier, string> = {
  self_serve: "Self-serve",
  light_review: "Light review",
  heavy_review: "Heavy review",
  gated_partner: "Gated partner program",
};

const DIFFICULTY_CLASS: Record<DifficultyTier, string> = {
  self_serve: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  light_review: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  heavy_review: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  gated_partner: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
};

export function DifficultyBadge({ tier }: { tier: DifficultyTier }) {
  return <Badge className={DIFFICULTY_CLASS[tier]}>{DIFFICULTY_LABEL[tier]}</Badge>;
}

const EVIDENCE_CLASS: Record<EvidenceLabel, string> = {
  TESTED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  DOCUMENTED: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  REPORTED: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  UNCERTAIN: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function EvidenceBadge({ label }: { label: EvidenceLabel }) {
  return <Badge variant="outline" className={EVIDENCE_CLASS[label]}>{label}</Badge>;
}

const OWNER_LABEL: Record<StepOwner, string> = {
  agent_can_do: "Agent can do",
  agent_can_assist: "Agent can assist",
  you_must_do: "You must do",
};

const OWNER_CLASS: Record<StepOwner, string> = {
  agent_can_do: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  agent_can_assist: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  you_must_do: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
};

const OWNER_ICON: Record<StepOwner, typeof Bot> = {
  agent_can_do: Bot,
  agent_can_assist: Wand2,
  you_must_do: User,
};

export function OwnerBadge({ owner }: { owner: StepOwner }) {
  const Icon = OWNER_ICON[owner];
  return (
    <Badge className={OWNER_CLASS[owner]}>
      <Icon className="size-3" />
      {OWNER_LABEL[owner]}
    </Badge>
  );
}
