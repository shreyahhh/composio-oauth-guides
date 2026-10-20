import { Composio } from "@composio/core";
import type { ManagedAuthStatus } from "@/lib/schema/guide";

const MANAGED_AUTH_DOCS_URL = "https://docs.composio.dev/toolkits/managed-auth";

let client: Composio | undefined;
function getClient(): Composio {
  if (!client) client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  return client;
}

/**
 * Checks whether Composio offers managed OAuth (its own shared OAuth app) for
 * a toolkit slug. A toolkit can expose several auth schemes (OAUTH2, API_KEY,
 * ...) with mixed managed status, so this surfaces the specific scheme(s)
 * found rather than a bare yes/no -- per Composio's own managed-auth docs.
 */
export async function checkManagedAuth(toolkitSlug: string): Promise<ManagedAuthStatus> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const toolkit = await getClient().toolkits.get(toolkitSlug);
    const schemes = toolkit.composioManagedAuthSchemes ?? [];
    const oauthSchemes = schemes.filter((s) => s === "OAUTH2" || s === "OAUTH1");

    if (oauthSchemes.length > 0) {
      return {
        checked: true,
        available: true,
        authScheme: oauthSchemes.join(", "),
        sourceUrl: MANAGED_AUTH_DOCS_URL,
        note:
          schemes.length > oauthSchemes.length
            ? `Composio manages ${oauthSchemes.join(", ")} for this toolkit; other auth schemes it supports are not managed.`
            : undefined,
      };
    }

    return {
      checked: true,
      available: false,
      sourceUrl: MANAGED_AUTH_DOCS_URL,
      note:
        schemes.length > 0
          ? `Composio manages ${schemes.join(", ")} for this toolkit, but not an OAuth scheme -- you'll still need your own OAuth app.`
          : "No Composio-managed auth scheme found for this toolkit as of " + today + ".",
    };
  } catch {
    // Toolkit not found by slug, or the API call failed -- fall back to citing the static docs page.
    return {
      checked: false,
      available: null,
      sourceUrl: MANAGED_AUTH_DOCS_URL,
      note: "Could not look up this toolkit via the Composio SDK; see the managed-auth docs directly.",
    };
  }
}
