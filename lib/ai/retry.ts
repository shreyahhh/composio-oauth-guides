import { APICallError } from "ai";

export class RateLimitedError extends Error {
  constructor() {
    super(
      "The free Groq API is rate-limited right now (free tier is rate-limited, not credit-limited). Please try again in a minute."
    );
    this.name = "RateLimitedError";
  }
}

function isRateLimit(err: unknown): boolean {
  return APICallError.isInstance(err) && err.statusCode === 429;
}

// Auth/billing failures are deterministic -- retrying wastes the Vercel
// function's 300s budget on a call that will never succeed. Everything else
// (429s, and transient generation failures like "Failed to generate JSON"
// from an LLM sampling a malformed response) is worth a fresh attempt: a
// new call may simply sample differently and succeed.
function isPermanentFailure(err: unknown): boolean {
  if (APICallError.isInstance(err) && [401, 402, 403].includes(err.statusCode ?? 0)) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (/invalid api key|does not exist or you do not have access|prepayment|exceeded your current quota/.test(msg)) {
      return true;
    }
  }
  return false;
}

// Groq's 429s are a per-minute token budget, not a per-request cooldown --
// the response tells us exactly how long until it resets (e.g. a
// "x-ratelimit-reset-tokens: 40.665s" header, or "...try again in 23.16s"
// in the message). A short exponential backoff (1s, 2s, 4s) barely dents a
// per-minute window, so for 429s specifically, wait for the real reset time
// instead of guessing.
function rateLimitDelayMs(err: unknown): number | null {
  if (!APICallError.isInstance(err) || err.statusCode !== 429) return null;
  const header = err.responseHeaders?.["x-ratelimit-reset-tokens"] ?? err.responseHeaders?.["retry-after"];
  const fromHeader = header ? parseFloat(header) : NaN;
  if (!Number.isNaN(fromHeader)) return Math.ceil(fromHeader * 1000) + 500;

  const fromMessage = err.message.match(/try again in ([\d.]+)s/i);
  if (fromMessage) return Math.ceil(parseFloat(fromMessage[1]) * 1000) + 500;

  return null;
}

/**
 * Runs an LLM call with backoff, retrying anything that isn't a clearly
 * permanent auth/billing failure -- including transient "failed to
 * generate JSON" errors from generateObject, which a fresh attempt often
 * resolves since LLM sampling is non-deterministic. Callers should pass
 * `maxRetries: 0` to their generateText/generateObject call so the AI SDK's
 * own internal retry doesn't also fire (with its own, shorter backoff) and
 * mask the real per-minute reset time this function needs to see.
 */
export async function withBackoff<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isPermanentFailure(err)) throw err;
      if (i < attempts - 1) {
        const delay = rateLimitDelayMs(err) ?? 1000 * 2 ** i;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw isRateLimit(lastErr) ? new RateLimitedError() : lastErr;
}
