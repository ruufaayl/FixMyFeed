/**
 * Integrations (task T158) — live data.
 *
 * Server component: resolves context and reads the workspace's connected sources
 * and destinations through the typed boundary, then renders them with the E10
 * ConnectCard. No sample-data fallback; unauthenticated / empty / error requests
 * render explicit states.
 */
import Link from "next/link";
import { ConnectCard, EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { IntegrationDTO } from "@/lib/server/dto";

export const dynamic = "force-dynamic";

function detailLine(integration: IntegrationDTO): string {
  const kind = integration.kind === "destination" ? "Destination" : "Source";
  return integration.detail ? `${kind} · ${integration.detail}` : kind;
}

export default async function IntegrationsPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view integrations"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let integrations: readonly IntegrationDTO[];
  try {
    integrations = await services().integrations.listIntegrations(context);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load integrations";
    return <EmptyState kind="unavailable" title="Integrations unavailable" description={message} />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Integrations</h1>

      {integrations.length === 0 ? (
        <EmptyState
          kind="no-data"
          title="No integrations yet"
          description="Connect a store to start diagnosing your product feed."
          action={
            <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
              Connect a store
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {integrations.map((integration) => (
            <ConnectCard
              key={integration.id}
              title={integration.name}
              description={detailLine(integration)}
              state={integration.connectState}
              action={
                integration.connectState === "connected" ? (
                  <Link
                    href="/integrations"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Manage
                  </Link>
                ) : (
                  <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
                    Connect
                  </Link>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
