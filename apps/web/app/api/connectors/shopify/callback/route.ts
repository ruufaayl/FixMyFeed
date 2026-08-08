/**
 * Shopify OAuth install callback (connector install wiring).
 *
 * Verifies the callback (HMAC + state + shop) against the signed state cookie,
 * exchanges the code for a token, stores it in the credential vault, and records
 * the connection — all through the typed boundary. Always clears the state cookie
 * and redirects back to onboarding with a coarse status (never leaks details).
 * Node.js runtime (uses the database client + crypto).
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  shopifyInstallConfig,
  shopifyInstallPorts,
  authSecret,
  scheduleOnboarding,
} from "@/lib/server/runtime";
import {
  completeShopifyInstall,
  verifyInstallState,
  INSTALL_STATE_COOKIE,
} from "@/lib/server/connector-install";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const config = shopifyInstallConfig();
  const base = config.appUrl.replace(/\/$/, "");

  const jar = await cookies();
  const cookie = verifyInstallState(jar.get(INSTALL_STATE_COOKIE)?.value, authSecret());

  const redirect = (query: string) => {
    const response = NextResponse.redirect(`${base}/onboarding${query}`, { status: 303 });
    response.cookies.set(INSTALL_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  if (!cookie || !config.enabled || !config.clientId || !config.clientSecret) {
    return redirect("?error=state");
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  try {
    const ports = shopifyInstallPorts();
    const { shop } = await completeShopifyInstall(
      { params, cookie, clientId: config.clientId, clientSecret: config.clientSecret },
      ports.exchange,
      ports.persistence,
    );
    // Kick off the connect → import → scan journey (durable ids only).
    await scheduleOnboarding(cookie.organizationId, shop);
    return redirect("?connected=shopify");
  } catch {
    return redirect("?error=install");
  }
}
