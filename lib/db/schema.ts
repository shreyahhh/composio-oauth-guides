import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { Guide } from "@/lib/schema/guide";

export const guides = pgTable("guides", {
  slug: text("slug").primaryKey(),
  appName: text("app_name").notNull(),
  appUrl: text("app_url"),
  source: text("source", { enum: ["handcrafted", "generated"] }).notNull(),
  guideJson: jsonb("guide_json").$type<Guide>().notNull(),
  modelVersion: text("model_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
