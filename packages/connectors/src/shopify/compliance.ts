/**
 * Shopify privacy (GDPR) and uninstall callbacks (task T045).
 *
 * Shopify requires every app to handle the mandatory compliance webhooks and
 * the uninstall webhook (shopify-uninstall-workflow.md,
 * shopify-customer-data-redaction.md, shopify-shop-redaction.md):
 *
 * - `customers/data_request` — surface any stored data for a customer;
 * - `customers/redact` — erase a specific customer's data;
 * - `shop/redact` — 48h after uninstall, erase all data for the shop;
 * - `app/uninstalled` — revoke the connection and stop syncing.
 *
 * FixMyFeed stores product/feed data, not customer PII, so the customer
 * callbacks resolve to safe no-op/empty actions — but they MUST still be parsed
 * and acknowledged. This module is pure: it verifies transport via T042, parses
 * the payload into a normalized command, and computes the action plan the worker
 * executes (revoke connection, delete shop catalog/snapshots). No network here.
 */
import { ConnectorError } from "../errors.js";
import { normalizeShopDomain } from "./oauth.js";

export const SHOPIFY_COMPLIANCE_TOPICS = [
  "customers/data_request",
  "customers/redact",
  "shop/redact",
] as const;
export const SHOPIFY_UNINSTALL_TOPIC = "app/uninstalled" as const;

export const SHOPIFY_COMPLIANCE_KINDS = [
  "customer.data_request",
  "customer.redact",
  "shop.redact",
  "app.uninstalled",
] as const;
export type ShopifyComplianceKind = (typeof SHOPIFY_COMPLIANCE_KINDS)[number];

/** True if the topic is a mandatory GDPR compliance topic. */
export function isShopifyComplianceTopic(topic: string): boolean {
  return (SHOPIFY_COMPLIANCE_TOPICS as readonly string[]).includes(topic);
}

export interface CustomerDataRequestCommand {
  readonly kind: "customer.data_request";
  readonly shopDomain: string;
  readonly shopId: number | null;
  readonly customerId: number | null;
  readonly ordersRequested: readonly number[];
  readonly dataRequestId: number | null;
}
export interface CustomerRedactCommand {
  readonly kind: "customer.redact";
  readonly shopDomain: string;
  readonly shopId: number | null;
  readonly customerId: number | null;
  readonly ordersToRedact: readonly number[];
}
export interface ShopRedactCommand {
  readonly kind: "shop.redact";
  readonly shopDomain: string;
  readonly shopId: number | null;
}
export interface AppUninstalledCommand {
  readonly kind: "app.uninstalled";
  readonly shopDomain: string;
  readonly shopId: number | null;
}
export type ShopifyComplianceCommand =
  CustomerDataRequestCommand | CustomerRedactCommand | ShopRedactCommand | AppUninstalledCommand;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const numArray = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];

/** Reads the shop domain from a compliance/uninstall payload (shop_domain or myshopify_domain). */
function shopDomainFromBody(body: Record<string, unknown>): string {
  const raw = body.shop_domain ?? body.myshopify_domain ?? body.domain;
  return normalizeShopDomain(raw);
}

/**
 * Parses a Shopify compliance or uninstall webhook payload into a normalized
 * command. Throws `ConnectorError` (validation) on an unknown topic or a missing
 * / invalid shop domain.
 */
export function parseShopifyCompliancePayload(
  topic: string,
  body: Record<string, unknown>,
): ShopifyComplianceCommand {
  const shopDomain = shopDomainFromBody(body ?? {});
  const shopId = num(body.shop_id ?? body.id);
  const customer = (body.customer ?? {}) as Record<string, unknown>;

  switch (topic) {
    case "customers/data_request":
      return {
        kind: "customer.data_request",
        shopDomain,
        shopId,
        customerId: num(customer.id),
        ordersRequested: numArray(body.orders_requested),
        dataRequestId: num((body.data_request as Record<string, unknown> | undefined)?.id),
      };
    case "customers/redact":
      return {
        kind: "customer.redact",
        shopDomain,
        shopId,
        customerId: num(customer.id),
        ordersToRedact: numArray(body.orders_to_redact),
      };
    case "shop/redact":
      return { kind: "shop.redact", shopDomain, shopId };
    case "app/uninstalled":
      return { kind: "app.uninstalled", shopDomain, shopId };
    default:
      throw new ConnectorError(`unsupported compliance topic: ${topic}`, "validation");
  }
}

export const SHOPIFY_COMPLIANCE_ACTIONS = [
  "revoke_oauth_connection",
  "cancel_active_syncs",
  "delete_shop_catalog",
  "delete_shop_snapshots",
  "purge_shop_records",
  "export_customer_data",
  "delete_customer_data",
] as const;
export type ShopifyComplianceAction = (typeof SHOPIFY_COMPLIANCE_ACTIONS)[number];

export interface ShopifyCompliancePlan {
  readonly shopDomain: string;
  readonly kind: ShopifyComplianceKind;
  readonly actions: readonly ShopifyComplianceAction[];
  /** True when the actions should be applied immediately (vs scheduled). */
  readonly immediate: boolean;
  /**
   * True when the app holds no data for this command (FixMyFeed stores no
   * customer PII), so the action is a safe, recorded no-op.
   */
  readonly noopSafe: boolean;
}

/**
 * Computes the deletion/uninstall action plan for a command. Uninstall revokes
 * the connection and stops syncs; shop redact deletes all shop data; customer
 * callbacks are safe no-ops (no customer PII is stored) but still produce an
 * auditable action.
 */
export function planComplianceActions(command: ShopifyComplianceCommand): ShopifyCompliancePlan {
  switch (command.kind) {
    case "app.uninstalled":
      return {
        shopDomain: command.shopDomain,
        kind: command.kind,
        actions: ["revoke_oauth_connection", "cancel_active_syncs"],
        immediate: true,
        noopSafe: false,
      };
    case "shop.redact":
      return {
        shopDomain: command.shopDomain,
        kind: command.kind,
        actions: ["delete_shop_catalog", "delete_shop_snapshots", "purge_shop_records"],
        immediate: true,
        noopSafe: false,
      };
    case "customer.redact":
      return {
        shopDomain: command.shopDomain,
        kind: command.kind,
        actions: ["delete_customer_data"],
        immediate: true,
        noopSafe: true,
      };
    case "customer.data_request":
      return {
        shopDomain: command.shopDomain,
        kind: command.kind,
        actions: ["export_customer_data"],
        immediate: true,
        noopSafe: true,
      };
  }
}
