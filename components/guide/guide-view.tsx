import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Guide } from "@/lib/schema/guide";
import { DifficultyBadge, EvidenceBadge, OwnerBadge } from "./badges";
import { CopyLinkButton } from "./copy-link-button";

// A plain <div>, not <li> -- this is used both as a direct list item
// (Prerequisites) and nested inside other <li> elements (Steps, Scopes,
// Blockers), and <li> cannot be a descendant of <li> without an
// intervening <ul>/<ol> (a React hydration error, not just invalid HTML).
function ClaimLine({ text, evidence, sourceUrl }: { text: string; evidence: Guide["prerequisites"][number]["evidence"]; sourceUrl?: string | null }) {
  return (
    <div className="flex flex-wrap items-start gap-2 text-sm">
      <EvidenceBadge label={evidence} />
      <span className="flex-1 min-w-[12rem]">
        {text}
        {sourceUrl && (
          <>
            {" "}
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
              source
            </a>
          </>
        )}
      </span>
    </div>
  );
}

export function GuideView({ guide }: { guide: Guide }) {
  const { verdict, evidenceSummary, managedAuth } = guide;

  return (
    <div className="max-w-3xl space-y-6 px-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{guide.appName}</h1>
            <Badge variant={guide.source === "handcrafted" ? "secondary" : "outline"}>
              {guide.source === "handcrafted" ? "Verified guide" : "Agent-generated"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {new Date(guide.generatedAt).toLocaleDateString()}
            {guide.appUrl && (
              <>
                {" "}
                &middot;{" "}
                <a href={guide.appUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {guide.appUrl.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </p>
        </div>
        <CopyLinkButton slug={guide.slug} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DifficultyBadge tier={verdict.difficultyTier} />
            <CardTitle className="text-base">Verdict</CardTitle>
          </div>
          <CardDescription>{verdict.summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">First test connection</div>
            <div className="text-sm">{verdict.timeToFirstTestConnection}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">Production approval</div>
            <div className="text-sm">{verdict.timeToProductionApproval}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composio managed auth</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {managedAuth.checked ? (
            managedAuth.available ? (
              <p>
                Composio can provide the OAuth app for this toolkit
                {managedAuth.authScheme ? ` (${managedAuth.authScheme})` : ""} -- you may not need to register your
                own. {managedAuth.note}
              </p>
            ) : (
              <p>No Composio-managed OAuth found for this toolkit -- you&apos;ll need your own OAuth app. {managedAuth.note}</p>
            )
          ) : (
            <p className="text-muted-foreground">{managedAuth.note ?? "Could not determine managed-auth status."}</p>
          )}
          {managedAuth.sourceUrl && (
            <a href={managedAuth.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline underline-offset-2 text-muted-foreground">
              Composio docs
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prerequisites</CardTitle>
        </CardHeader>
        <CardContent>
          {guide.prerequisites.length > 0 ? (
            <div className="space-y-2">
              {guide.prerequisites.map((p, i) => (
                <ClaimLine key={i} text={p.text} evidence={p.evidence} sourceUrl={p.sourceUrl} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None identified.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-0">
            {[...guide.steps]
              .sort((a, b) => a.order - b.order)
              .map((step, i, arr) => {
                const isLast = i === arr.length - 1;
                return (
                  <li key={step.order} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted text-xs font-medium">
                        {step.order}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 min-h-6 bg-border" />}
                    </div>
                    <div className={isLast ? "pb-1" : "pb-6"}>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-sm font-medium">{step.title}</span>
                        <OwnerBadge owner={step.owner} />
                        {step.estimatedMinutes && (
                          <span className="text-xs text-muted-foreground">~{step.estimatedMinutes} min</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      {step.evidence && (
                        <div className="mt-1">
                          <ClaimLine text={step.evidence.text} evidence={step.evidence.evidence} sourceUrl={step.evidence.sourceUrl} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
          </ol>
        </CardContent>
      </Card>

      {guide.scopesAndTiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scopes and tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {guide.scopesAndTiers.map((s, i) => (
                <li key={i} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s.scopeName}</code>
                    {s.triggersReview && <Badge variant="destructive">Triggers review</Badge>}
                  </div>
                  <div className="mt-1">
                    <ClaimLine text={s.notes.text} evidence={s.notes.evidence} sourceUrl={s.notes.sourceUrl} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {guide.blockers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blockers and workarounds</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {guide.blockers.map((b, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">{b.reason}</p>
                  {b.workaround && <p className="text-muted-foreground">Workaround: {b.workaround}</p>}
                  <div className="mt-1">
                    <ClaimLine text={b.evidence.text} evidence={b.evidence.evidence} sourceUrl={b.evidence.sourceUrl} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-3">
          <span>{evidenceSummary.testedCount} tested</span>
          <span>{evidenceSummary.documentedCount} documented</span>
          <span>{evidenceSummary.reportedCount} reported</span>
          <span>{evidenceSummary.uncertainCount} uncertain</span>
        </div>
        <Link href={`/guides/${guide.slug}/markdown`} className="underline underline-offset-2" target="_blank">
          Copy as Markdown
        </Link>
      </div>
    </div>
  );
}
