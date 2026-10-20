import { config } from "dotenv";
config({ path: ".env.local" });

import { runPipeline } from "@/lib/pipeline/run";

const TARGETS = [
  { input: "GitHub", slugOverride: "github-generated" },
  { input: "Google", slugOverride: "google-generated" },
];

async function main() {
  for (const target of TARGETS) {
    console.log(`\n=== Generating "${target.input}" -> ${target.slugOverride} ===`);
    await runPipeline({
      input: target.input,
      slugOverride: target.slugOverride,
      onEvent: (event) => console.log(JSON.stringify(event)),
    });
  }
  console.log("\nDone. Now compare app/guides/github vs github-generated, and google vs google-generated,");
  console.log("and fill in data/evidence-findings.ts with what matched, what was wrong, and what was missed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
