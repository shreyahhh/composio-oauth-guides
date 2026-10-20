import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy: the real connection/env-var check only happens on first query, not
// at module import time. Next.js evaluates route modules during its build
// "collect page data" phase even for routes that are never invoked, so an
// eager throw here would fail the production build whenever DATABASE_URL
// isn't present at build time (e.g. CI, or a fresh clone before setup).
let _db: NeonHttpDatabase<typeof schema> | undefined;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    }
    _db = drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
