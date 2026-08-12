"use client";

/**
 * Onboarding view — client.
 *
 * Drives the real Shopify OAuth install: enter a myshopify.com domain → server
 * action validates + sets the signed state cookie and returns the authorize URL →
 * the browser is sent to Shopify. The callback route completes the exchange and
 * redirects back with a status the view surfaces. Google is not yet wired.
 * Design unchanged from E10.
 */
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  ConnectCard,
  Input,
  Metric,
  Progress,
  Stepper,
  Surface,
  EmptyState,
  type ConnectState,
} from "@fixmyfeed/ui";
import type { OnboardingStatusDTO } from "@/lib/server/onboarding-run";
import { startShopifyInstall, getOnboardingStatus } from "./actions";

export interface OnboardingViewProps {
  readonly authenticated: boolean;
  readonly shopifyConfigured: boolean;
  readonly shopifyConnected: boolean;
  readonly onboarding: OnboardingStatusDTO;
}

export function OnboardingView({
  authenticated,
  shopifyConfigured,
  shopifyConnected,
  onboarding: initialOnboarding,
}: OnboardingViewProps) {
  const params = useSearchParams();
  const justConnected = params.get("connected") === "shopify" || shopifyConnected;
  const callbackError = params.get("error");

  const [shop, setShop] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(initialOnboarding);

  // Poll the import→scan journey while it is queued/running.
  useEffect(() => {
    if (onboarding.state !== "queued" && onboarding.state !== "running") return;
    const timer = setInterval(async () => {
      const result = await getOnboardingStatus();
      if (result.ok) setOnboarding(result.status);
    }, 3000);
    return () => clearInterval(timer);
  }, [onboarding.state]);

  const scanDone = onboarding.state === "completed";
  const scanActive = onboarding.state === "queued" || onboarding.state === "running";

  const steps = [
    {
      id: "store",
      label: "Connect your store",
      state: justConnected ? ("done" as const) : ("active" as const),
    },
    {
      id: "import",
      label: "Import your catalog",
      state: scanDone
        ? ("done" as const)
        : scanActive
          ? ("active" as const)
          : ("upcoming" as const),
    },
    {
      id: "scan",
      label: "Run your first scan",
      state: scanDone
        ? ("done" as const)
        : scanActive
          ? ("active" as const)
          : ("upcoming" as const),
    },
  ];

  const shopifyState: ConnectState = justConnected ? "connected" : "not-connected";

  function connect() {
    setError(null);
    startTransition(async () => {
      const result = await startShopifyInstall(shop.trim());
      if (result.ok) window.location.assign(result.url);
      else setError(result.error.message);
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6" aria-busy={pending}>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Welcome to FixMyFeed</h1>
        <p className="text-[14px] text-[var(--fmf-text-muted)]">
          Let&rsquo;s find out what&rsquo;s costing your catalog visibility.
        </p>
      </div>

      {justConnected && (
        <EmptyState
          kind="no-data"
          title="Store connected"
          description="Your Shopify store is connected. Run a scan to see what needs fixing."
        />
      )}
      {callbackError !== null && !justConnected && (
        <EmptyState
          kind="unavailable"
          title="Could not complete the connection"
          description={
            callbackError === "state"
              ? "The connection request expired or could not be verified. Please try again."
              : "Shopify did not complete the install. Please try again."
          }
        />
      )}
      {error !== null && (
        <EmptyState kind="unavailable" title="Could not start the connection" description={error} />
      )}

      <Surface padding="lg">
        <Stepper steps={steps} />
      </Surface>

      {onboarding.state !== "none" && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Import &amp; scan</h2>
          <Surface>
            {onboarding.state === "completed" ? (
              <div className="flex flex-wrap gap-6">
                <Metric label="Health score" value={String(onboarding.healthScore ?? "—")} />
                <Metric label="Products imported" value={String(onboarding.productCount ?? "—")} />
                <Metric label="Issues found" value={String(onboarding.issuesFound ?? "—")} />
              </div>
            ) : onboarding.state === "failed" ? (
              <EmptyState
                kind="unavailable"
                title="Import could not complete"
                description="We couldn't finish the first import and scan. You can retry from Integrations."
              />
            ) : (
              <Progress
                value={onboarding.progress}
                max={100}
                label="Importing your catalog and running the first scan…"
                tone="brand"
              />
            )}
          </Surface>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Surface padding="md">
          <div className="flex flex-col gap-3">
            <ConnectCard
              title="Shopify"
              description="Import your product catalog."
              state={shopifyState}
              action={
                shopifyState === "connected" ? (
                  <Button size="sm" variant="secondary" disabled>
                    Connected
                  </Button>
                ) : !authenticated ? (
                  <Button size="sm" disabled>
                    Sign in to connect
                  </Button>
                ) : !shopifyConfigured ? (
                  <Button size="sm" disabled>
                    Not configured
                  </Button>
                ) : (
                  <Button size="sm" disabled={pending || shop.trim() === ""} onClick={connect}>
                    {pending ? "Redirecting…" : "Connect"}
                  </Button>
                )
              }
            />
            {shopifyState !== "connected" && authenticated && shopifyConfigured && (
              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[var(--fmf-text-muted)]">Store domain</span>
                <Input
                  value={shop}
                  onChange={(event) => setShop(event.target.value)}
                  placeholder="your-store.myshopify.com"
                  aria-label="Shopify store domain"
                />
              </label>
            )}
          </div>
        </Surface>

        <ConnectCard
          title="Google Merchant Center"
          description="Read product disapprovals and issues."
          state="not-connected"
          action={
            <Button size="sm" disabled>
              Coming soon
            </Button>
          }
        />
      </div>
    </div>
  );
}
