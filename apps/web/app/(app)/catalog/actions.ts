"use server";

/**
 * Catalog server actions (task T152).
 *
 * Loads a product inspector through the typed boundary. Returns a discriminated
 * result (never throws across to the client, never leaks infrastructure errors).
 */
import { getServerContext, services } from "@/lib/server/runtime";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";
import type { ProductInspectorDTO } from "@/lib/server/dto";

export type InspectorResult =
  | { readonly ok: true; readonly data: ProductInspectorDTO }
  | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function loadProductInspector(productId: string): Promise<InspectorResult> {
  try {
    const context = await getServerContext();
    const data = await services().catalog.getProductInspector(context, productId);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
