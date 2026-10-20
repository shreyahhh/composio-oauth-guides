import type { Guide, SourcedClaim } from "@/lib/schema/guide";

function claimLine(claim: SourcedClaim): string {
  const src = claim.sourceUrl ? ` ([source](${claim.sourceUrl}))` : "";
  return `- **[${claim.evidence}]** ${claim.text}${src} _(checked ${claim.lastChecked})_`;
}

export function guideToMarkdown(guide: Guide): string {
  const lines: string[] = [];
  lines.push(`# ${guide.appName} -- OAuth Setup Guide`);
  lines.push("");
  lines.push(
    `> ${guide.source === "handcrafted" ? "Verified guide" : "Agent-generated guide"} -- generated ${guide.generatedAt}`
  );
  lines.push("");
  lines.push(`## Verdict: ${guide.verdict.difficultyTier.replace(/_/g, " ")}`);
  lines.push("");
  lines.push(guide.verdict.summary);
  lines.push("");
  lines.push(`- **First test connection:** ${guide.verdict.timeToFirstTestConnection}`);
  lines.push(`- **Production approval:** ${guide.verdict.timeToProductionApproval}`);
  lines.push("");

  lines.push(`## Composio managed auth`);
  lines.push("");
  lines.push(
    guide.managedAuth.checked
      ? guide.managedAuth.available
        ? `Available${guide.managedAuth.authScheme ? ` (${guide.managedAuth.authScheme})` : ""}. ${guide.managedAuth.note ?? ""}`
        : `Not available. ${guide.managedAuth.note ?? ""}`
      : guide.managedAuth.note ?? "Could not determine."
  );
  lines.push("");

  if (guide.prerequisites.length) {
    lines.push("## Prerequisites");
    lines.push("");
    guide.prerequisites.forEach((p) => lines.push(claimLine(p)));
    lines.push("");
  }

  lines.push("## Steps");
  lines.push("");
  [...guide.steps]
    .sort((a, b) => a.order - b.order)
    .forEach((step) => {
      lines.push(`${step.order}. **${step.title}** _(${step.owner.replace(/_/g, " ")})_`);
      lines.push("");
      lines.push(`   ${step.description}`);
      if (step.evidence) lines.push(`   - ${claimLine(step.evidence)}`);
      lines.push("");
    });

  if (guide.scopesAndTiers.length) {
    lines.push("## Scopes and tiers");
    lines.push("");
    guide.scopesAndTiers.forEach((s) => {
      lines.push(`- \`${s.scopeName}\`${s.triggersReview ? " -- triggers review" : ""}`);
      lines.push(`  - ${claimLine(s.notes)}`);
    });
    lines.push("");
  }

  if (guide.blockers.length) {
    lines.push("## Blockers and workarounds");
    lines.push("");
    guide.blockers.forEach((b) => {
      lines.push(`- **${b.reason}**${b.workaround ? ` -- workaround: ${b.workaround}` : ""}`);
      lines.push(`  - ${claimLine(b.evidence)}`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push(
    `Evidence: ${guide.evidenceSummary.testedCount} tested, ${guide.evidenceSummary.documentedCount} documented, ${guide.evidenceSummary.reportedCount} reported, ${guide.evidenceSummary.uncertainCount} uncertain.`
  );

  return lines.join("\n");
}
