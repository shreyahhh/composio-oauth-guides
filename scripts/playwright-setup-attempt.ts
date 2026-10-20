/**
 * Human-in-the-loop "setup attempt" for GitHub OAuth Apps.
 *
 * Runs locally only (never deployed, never run on Vercel). Opens a real,
 * headed browser window and drives it up to the point where YOU must take
 * over -- logging in and clicking "Register application" / generating a
 * client secret. This script never sees, touches, or stores your
 * credentials; it only observes and screenshots public form structure.
 *
 * Run with: npx tsx scripts/playwright-setup-attempt.ts
 *
 * IMPORTANT: review the screenshots in evidence/github/ before committing --
 * the GitHub nav bar will show your real username/avatar. Crop or blur that
 * if you don't want it in the repo.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "evidence", "github");
const NEW_APP_URL = "https://github.com/settings/applications/new";

type LogEntry = { step: string; url: string; timestamp: string; note: string };
const log: LogEntry[] = [];

function record(step: string, url: string, note: string) {
  log.push({ step, url, timestamp: new Date().toISOString(), note });
  console.log(`[${step}] ${note}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  record("navigate", NEW_APP_URL, "Opening the new OAuth App form.");
  await page.goto(NEW_APP_URL);
  await page.screenshot({ path: path.join(OUT_DIR, "01-initial-navigation.png") });

  if (page.url().includes("/login")) {
    record("login_required", page.url(), "Redirected to GitHub login -- this script stops here. Log in manually in this window.");
    await page.screenshot({ path: path.join(OUT_DIR, "02-login-required.png") });

    console.log("\n>>> Please log in to GitHub in the opened browser window.");
    console.log(">>> This script never sees your password or 2FA code -- it only waits for the URL to change.\n");

    try {
      await page.waitForURL((url) => url.toString().includes("/settings/applications"), { timeout: 5 * 60 * 1000 });
      record("login_complete", page.url(), "Back on the applications page after manual login.");
    } catch {
      record("login_timeout", page.url(), "Timed out waiting for manual login (5 min). Stopping.");
      await page.screenshot({ path: path.join(OUT_DIR, "03-login-timeout.png") });
      await browser.close();
      await writeFile(path.join(OUT_DIR, "log.json"), JSON.stringify(log, null, 2));
      return;
    }

    // After login, GitHub may land on /settings/applications rather than
    // the /new form directly -- re-navigate to be sure we're on the form.
    if (!page.url().includes("/new")) {
      await page.goto(NEW_APP_URL);
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, "04-new-app-form.png") });
  record("form_loaded", page.url(), "New OAuth App form loaded.");

  // Observe the form fields the docs describe, without assuming exact
  // selectors -- GitHub's DOM can change. Each lookup is independently
  // best-effort so one missing field doesn't abort the whole run.
  const fieldLabels = ["Application name", "Homepage URL", "Application description", "Authorization callback URL"];
  for (const label of fieldLabels) {
    try {
      const field = page.getByLabel(label, { exact: false }).first();
      const visible = await field.isVisible({ timeout: 3000 });
      record("field_found", page.url(), `Field "${label}": ${visible ? "visible" : "not visible"}`);
    } catch {
      record("field_missing", page.url(), `Field "${label}" not found with getByLabel -- GitHub's form markup may have changed.`);
    }
  }

  // Illustrative, non-secret sample values for the "agent can assist" step
  // -- prefilling what an automation agent plausibly could, never anything
  // that requires the human's identity or judgment.
  try {
    await page.getByLabel("Application name", { exact: false }).first().fill("My Test App (sample)");
    await page.getByLabel("Homepage URL", { exact: false }).first().fill("http://localhost:3000");
    await page.getByLabel("Authorization callback URL", { exact: false }).first().fill("http://localhost:3000/api/auth/callback");
    await page.screenshot({ path: path.join(OUT_DIR, "05-form-prefilled-sample.png") });
    record("form_prefilled", page.url(), "Prefilled sample non-secret values -- illustrates the agent_can_assist step.");
  } catch {
    record("prefill_failed", page.url(), "Could not prefill one or more fields.");
  }

  record("stopping", page.url(), "Stopping before 'Register application' -- registering and generating a client secret are you_must_do steps.");

  await browser.close();
  await writeFile(path.join(OUT_DIR, "log.json"), JSON.stringify(log, null, 2));
  console.log(`\nDone. Review screenshots and log.json in ${OUT_DIR} before committing -- the nav bar shows your real GitHub username/avatar.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
