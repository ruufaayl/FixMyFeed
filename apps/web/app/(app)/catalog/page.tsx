/**
 * Catalog explorer (task T152) — live data.
 *
 * Server component: resolves context and reads the first page of catalog products
 * through the typed boundary, then hands DTOs to the client `CatalogView`. No
 * sample-data fallback; unauthenticated/error requests render explicit states.
 */
import Link from "next/link";
import { EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { CatalogProductDTO } from "@/lib/server/dto";
import { CatalogView } from "./catalog-view";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view your catalog"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let products: readonly CatalogProductDTO[];
  try {
    const page = await services().catalog.listProducts(context, { page: { limit: 50 } });
    products = page.items;
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load catalog";
    return <EmptyState kind="unavailable" title="Catalog unavailable" description={message} />;
  }

  return <CatalogView products={products} />;
}
