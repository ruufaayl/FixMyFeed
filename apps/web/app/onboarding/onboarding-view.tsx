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
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  ConnectCard,
  Input,
  Stepper,
  Surface,
  EmptyState,
  type ConnectState,
} from "@fixmyfeed/ui";
import { startShopifyInstall } from "./actions";

export interface OnboardingViewProps {
  readonly authenticated: boolean;
  readonly shopifyConfigured: boolean;
  readonly shopifyConnected: boolean;
}

export function OnboardingView({
  authenticated,
  shopifyConfigured,
  shopifyConnected,
}: OnboardingViewProps) {
  const params = useSearchParams();
  const justConnected = params.get("connected") === "shopify" || shopifyConnected;
  const callbackError = params.get("error");

  const [shop, setShop] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const shopifyState: ConnectState = justConnected ? "connected" : "not-connected";

  const steps = [
    {
      id: "store",
      label: "Connect your store",
      state: justConnected ? ("done" as const) : ("active" as const),
    },
    {
      id: "google",
      label: "Connect Google Merchant Center",
      state: justConnected ? ("active" as const) : ("upcoming" as const),
    },
    {
      id: "scan",
      label: "Run your first scan",
      state: justConnected ? ("active" as const) : ("upcoming" as const),
    },
  ];

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
