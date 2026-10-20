import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/lib/db/client";
import { guides } from "@/lib/db/schema";
import { checkManagedAuth } from "@/lib/composio";
import { computeEvidenceSummary, GuideSchema, slugify, type Guide } from "@/lib/schema/guide";
import type { HandcraftedGuideInput } from "@/data/guides/types";
import { githubGuide } from "@/data/guides/github";
import { notionGuide } from "@/data/guides/notion";
import { spotifyGuide } from "@/data/guides/spotify";
import { googleGuide } from "@/data/guides/google";

const HANDCRAFTED: HandcraftedGuideInput[] = [githubGuide, notionGuide, spotifyGuide, googleGuide];

async function seedOne(input: HandcraftedGuideInput) {
  const slug = slugify(input.appName);
  console.log(`Seeding ${input.appName} (${slug})...`);

  const managedAuth = await checkManagedAuth(slug);
  const withoutSummary = {
    ...input,
    slug,
    managedAuth,
    source: "handcrafted" as const,
    generatedAt: new Date().toISOString(),
    pipelineVersion: null,
  };
  const guide: Guide = { ...withoutSummary, evidenceSummary: computeEvidenceSummary(withoutSummary) };
  const validated = GuideSchema.parse(guide);

  await db
    .insert(guides)
    .values({
      slug,
      appName: validated.appName,
      appUrl: validated.appUrl,
      source: "handcrafted",
      guideJson: validated,
      modelVersion: null,
    })
    .onConflictDoUpdate({
      target: guides.slug,
      set: {
        appName: validated.appName,
        appUrl: validated.appUrl,
        guideJson: validated,
        updatedAt: new Date(),
      },
    });

  console.log(`  -> managed auth: ${managedAuth.checked ? (managedAuth.available ? "available" : "not available") : "unknown"}`);
}

async function main() {
  for (const g of HANDCRAFTED) {
    await seedOne(g);
  }
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
