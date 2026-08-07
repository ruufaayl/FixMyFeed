"use client";

/**
 * Onboarding page (task T102).
 *
 * The compact "connect → connect → scan" flow. Connection state is local demo
 * state here; later tasks wire it to real OAuth connect actions and kick off the
 * first scan, whose result becomes the merchant's first real experience
 * ("We found N issues affecting M products").
 */
import { useState } from "react";
import { Button, ConnectCard, Stepper, Surface, type ConnectState } from "@fixmyfeed/ui";

export default function OnboardingPage() {
  const [shopify, setShopify] = useState<ConnectState>("not-connected");
  const [google, setGoogle] = useState<ConnectState>("not-connected");

  const step = (connected: ConnectState) => connected === "connected";
  const steps = [
    {
      id: "store",
      label: "Connect your store",
      state: step(shopify) ? ("done" as const) : ("active" as const),
    },
    {
      id: "google",
      label: "Connect Google Merchant Center",
      state: step(shopify)
        ? step(google)
          ? ("done" as const)
          : ("active" as const)
        : ("upcoming" as const),
    },
    {
      id: "scan",
      label: "Run your first scan",
      state: step(shopify) && step(google) ? ("active" as const) : ("upcoming" as const),
    },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Welcome to FixMyFeed</h1>
        <p className="text-[14px] text-[var(--fmf-text-muted)]">
          Let&rsquo;s find out what&rsquo;s costing your catalog visibility.
        </p>
      </div>

      <Surface padding="lg">
        <Stepper steps={steps} />
      </Surface>

      <div className="flex flex-col gap-3">
        <ConnectCard
          title="Shopify"
          description="Import your product catalog."
          state={shopify}
          action={
            <Button
              size="sm"
              variant={shopify === "connected" ? "secondary" : "primary"}
              onClick={() => setShopify("connected")}
            >
              {shopify === "connected" ? "Connected" : "Connect"}
            </Button>
          }
        />
        <ConnectCard
          title="Google Merchant Center"
          description="Read product disapprovals and issues."
          state={google}
          action={
            <Button
              size="sm"
              variant={google === "connected" ? "secondary" : "primary"}
              onClick={() => setGoogle("connected")}
            >
              {google === "connected" ? "Connected" : "Connect"}
            </Button>
          }
        />
      </div>
    </div>
  );
}
