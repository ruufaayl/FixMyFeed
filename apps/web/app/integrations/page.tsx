/**
 * Integrations (task T107).
 *
 * Connected sources and destinations with their status and connect actions.
 * Sample data; wired to real connector connection state (E03–E06) in a later task.
 */
import Link from "next/link";
import { ConnectCard, buttonVariants } from "@fixmyfeed/ui";

export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Integrations</h1>

      <div className="flex flex-col gap-3">
        <ConnectCard
          title="Shopify"
          description="Source · product catalog"
          state="connected"
          action={
            <Link
              href="/integrations"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Manage
            </Link>
          }
        />
        <ConnectCard
          title="Google Merchant Center"
          description="Destination · product disapprovals"
          state="connected"
          action={
            <Link
              href="/integrations"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Manage
            </Link>
          }
        />
        <ConnectCard
          title="WooCommerce"
          description="Source · product catalog"
          state="not-connected"
          action={
            <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
              Connect
            </Link>
          }
        />
      </div>
    </div>
  );
}
