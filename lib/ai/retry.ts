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

/**
 * Runs an LLM call with exponential backoff on 429s. Non-429 errors are
 * rethrown immediately -- retrying those would just waste the Vercel
 * function's 300s budget on a call that isn't going to succeed.
 */
export async function withBackoff<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimit(err)) throw err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
      }
    }
  }
  throw new RateLimitedError();
}
