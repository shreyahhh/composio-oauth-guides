import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { guides } from "./schema";

export async function getGuideBySlug(slug: string) {
  const row = await db.query.guides.findFirst({ where: eq(guides.slug, slug) });
  return row ?? null;
}

export async function listGuides() {
  return db.query.guides.findMany({ orderBy: [desc(guides.updatedAt)] });
}
