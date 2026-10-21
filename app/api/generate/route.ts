import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { guides } from "@/lib/db/schema";
import { slugify } from "@/lib/schema/guide";
import { runPipeline } from "@/lib/pipeline/run";
import type { PipelineEvent } from "@/lib/pipeline/types";

export const maxDuration = 290; // stay under Vercel Hobby's 300s ceiling, leaving a margin

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const force = body?.force === true;

  if (!input) {
    return Response.json({ error: "Missing 'input' (an app name or URL)." }, { status: 400 });
  }

  // Quick same-input cache check. This is a heuristic: the pipeline's real
  // slug comes from the RESOLVED canonical app name, which can differ from
  // the raw input's slug (e.g. "google cal" vs the resolved "Google
  // Calendar"). A different wording of the same app may still re-run the
  // pipeline and overwrite the resolved slug's row (see onConflictDoUpdate
  // in runPipeline) -- this pre-check only short-circuits exact repeats.
  //
  // Wrapped in try/catch so a transient DB hiccup here (e.g. a cold-start
  // connection error) can't crash the route with an unhandled exception --
  // that previously surfaced to the client as a bare, empty-bodied 500,
  // which the generate-form client had no way to parse into a message and
  // left stuck on "Generating..." forever. Every failure path should return
  // a real JSON body the client can show the user.
  const quickSlug = slugify(input);
  if (!force) {
    let existing: { slug: string; updatedAt: Date } | undefined;
    try {
      existing = await db.query.guides.findFirst({ where: eq(guides.slug, quickSlug) });
    } catch (err) {
      console.error(err);
      return Response.json(
        { error: "Couldn't check for an existing guide right now. Please try again." },
        { status: 503 }
      );
    }
    if (existing) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "cached", slug: existing.slug, updatedAt: existing.updatedAt }) + "\n"
            )
          );
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        await runPipeline({ input, onEvent: send });
      } catch (err) {
        console.error(err);
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
