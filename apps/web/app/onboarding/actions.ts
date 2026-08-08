"use server";

/**
 * Onboarding connector-install actions (Shopify).
 *
 * Starts the Shopify OAuth install: validates config + shop domain through the
 * typed boundary, sets a signed httpOnly state cookie (CSRF nonce + tenant/actor),
 * and returns the Shopify authorize URL for the client to redirect to. The
 * callback route completes the exchange. Discriminated result; never throws.
 */
import { cookies } from "next/headers";
import { getServerContext, shopifyInstallConfig, authSecret } from "@/lib/server/runtime";
import { resolveScope } from "@/lib/server/tenant-scope";
import {
  beginShopifyInstall,
  signInstallState,
  INSTALL_STATE_COOKIE,
} from "@/lib/server/connector-install";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";

export type StartInstallResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function startShopifyInstall(shopDomain: string): Promise<StartInstallResult> {
  try {
    const context = await getServerContext();
    const scope = resolveScope(context); // UNAUTHENTICATED / NOT_FOUND if no active workspace
    const start = beginShopifyInstall(shopifyInstallConfig(), shopDomain);
    const signed = signInstallState(
      {
        state: start.state,
        shop: start.shop,
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        userId: scope.userId,
      },
      authSecret(),
    );
    const jar = await cookies();
    jar.set(INSTALL_STATE_COOKIE, signed, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return { ok: true, url: start.url };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
