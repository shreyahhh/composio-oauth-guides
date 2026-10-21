import type { Guide } from "@/lib/schema/guide";

/**
 * A generated guide that exists only to back /evidence's self-check
 * comparison against the same app's handcrafted guide (e.g. "github" vs.
 * "github-generated") -- not meant to be browsed as an independent library
 * entry, since it would show up next to its handcrafted counterpart with
 * the same app name and often a different verdict, with no indication of
 * why. /evidence fetches these directly by slug, so hiding them from the
 * Library/sidebar doesn't affect it.
 */
export function isSelfCheckDuplicate(guide: Guide, allGuides: Guide[]): boolean {
  if (guide.source !== "generated") return false;
  return allGuides.some((g) => g.source === "handcrafted" && guide.slug === `${g.slug}-generated`);
}

/** Guides meant to be publicly browsable in the Library and sidebar. */
export function libraryVisible(guides: Guide[]): Guide[] {
  return guides.filter((g) => !isSelfCheckDuplicate(g, guides));
}
