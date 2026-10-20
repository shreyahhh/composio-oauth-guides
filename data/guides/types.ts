import type { DraftedGuide } from "@/lib/schema/guide";

/**
 * Handcrafted guide content, minus managedAuth. The seed script computes
 * managedAuth live via the Composio SDK at seed time, rather than us
 * guessing/hardcoding it here -- it can change independently of the guide's
 * written content.
 */
export type HandcraftedGuideInput = Omit<DraftedGuide, "managedAuth">;
