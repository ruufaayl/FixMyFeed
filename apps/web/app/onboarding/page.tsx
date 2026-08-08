/**
 * Onboarding (connector install) — live data.
 *
 * Server component: resolves context + Shopify config/connection state through the
 * typed boundary and hands them to the client `OnboardingView`, which runs the
 * real Shopify OAuth install. Reachable pre-auth (it's the "get started" entry),
 * so it degrades gracefully when unauthenticated or when Shopify is unconfigured.
 */
import {
  getServerContext,
  shopifyInstallConfig,
  shopifyConnectionActive,
  onboardingStatus,
} from "@/lib/server/runtime";
import { resolveScope } from "@/lib/server/tenant-scope";
import type { OnboardingStatusDTO } from "@/lib/server/onboarding-run";
import { OnboardingView } from "./onboarding-view";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const context = await getServerContext();
  const config = shopifyInstallConfig();

  let organizationId: string | null = null;
  if (context !== null) {
    try {
      organizationId = resolveScope(context).organizationId;
    } catch {
      organizationId = null;
    }
  }
  const shopifyConnected =
    organizationId !== null ? await shopifyConnectionActive(organizationId) : false;
  const onboarding: OnboardingStatusDTO =
    organizationId !== null
      ? await onboardingStatus(organizationId)
      : { state: "none", progress: 0, productCount: null, healthScore: null, issuesFound: null };

  return (
    <OnboardingView
      authenticated={organizationId !== null}
      shopifyConfigured={config.enabled && config.vaultReady}
      shopifyConnected={shopifyConnected}
      onboarding={onboarding}
    />
  );
}
