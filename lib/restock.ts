// Restock Copilot (the "decide + act" layer).
//
// The forecast engine (forecast.ts) answers "when will this run out?". This
// module answers the questions an owner actually acts on: "what do I order,
// how much, from whom, and by when?" — then groups it into supplier purchase
// orders that can be shared in one tap.
//
// The math is deliberately transparent inventory theory, not a black box:
//   reorderPoint = expected demand over the supplier's lead time + a safety
//                  buffer (the owner's reorder threshold).
//   orderUpTo    = reorderPoint + demand over a target coverage window.
//   suggestedQty = orderUpTo − quantity on hand (rounded up).
// An item is suggested only once stock has fallen to/below its reorder point.

import { EnrichedProduct, Supplier } from "./types";
import { currency } from "./format";

const DAY_MS = 24 * 60 * 60 * 1000;

// How many days of demand a single order should aim to cover (beyond the lead
// time + safety buffer). Higher = fewer, larger orders.
export const TARGET_COVERAGE_DAYS = 10;

// An order-by date within this many days is flagged "order soon".
export const ORDER_SOON_DAYS = 3;

export type RestockUrgency = "overdue" | "soon" | "planned";

export interface RestockSuggestion {
  product: EnrichedProduct;
  supplier: Supplier | null;
  suggestedQty: number;
  reorderPoint: number;
  orderUpTo: number;
  /** Latest date to place the order and still avoid a stock-out (null = ASAP). */
  orderByDate: number | null;
  daysUntilOrderBy: number | null;
  urgency: RestockUrgency;
  estimatedCost: number;
  reason: string;
}

export interface PurchaseOrder {
  supplier: Supplier | null;
  lines: RestockSuggestion[];
  estimatedCost: number;
  earliestOrderBy: number | null;
  urgency: RestockUrgency;
}

export interface RestockPlan {
  suggestions: RestockSuggestion[];
  purchaseOrders: PurchaseOrder[];
  totalCost: number;
  totalItems: number;
}

const URGENCY_RANK: Record<RestockUrgency, number> = {
  overdue: 0,
  soon: 1,
  planned: 2,
};

/**
 * Decide whether a product needs reordering and, if so, how much. Returns null
 * when stock is comfortably above the reorder point.
 */
export function suggestRestock(
  product: EnrichedProduct,
  supplier: Supplier | null,
  now: number = Date.now()
): RestockSuggestion | null {
  const lead = supplier?.leadTimeDays ?? 0;
  const daily = product.forecast?.avgDailyConsumption ?? 0;
  const safety = product.reorderThreshold; // owner-set floor doubles as safety stock

  const reorderPoint = Math.ceil(daily * lead) + safety;
  if (product.quantity > reorderPoint) return null;

  const orderUpTo = reorderPoint + Math.ceil(daily * TARGET_COVERAGE_DAYS);
  const suggestedQty = Math.max(0, Math.ceil(orderUpTo - product.quantity));
  if (suggestedQty <= 0) return null;

  let orderByDate: number | null = null;
  let daysUntilOrderBy: number | null = null;
  if (product.forecast?.predictedStockoutDate != null) {
    orderByDate = product.forecast.predictedStockoutDate - lead * DAY_MS;
    daysUntilOrderBy = Math.round((orderByDate - now) / DAY_MS);
  }

  let urgency: RestockUrgency;
  if (daysUntilOrderBy == null) {
    urgency = product.quantity <= 0 ? "overdue" : "soon";
  } else if (daysUntilOrderBy <= 0) {
    urgency = "overdue";
  } else if (daysUntilOrderBy <= ORDER_SOON_DAYS) {
    urgency = "soon";
  } else {
    urgency = "planned";
  }

  const reason =
    daily > 0
      ? `Selling ~${daily.toFixed(1)} ${product.unit}/day` +
        (supplier ? ` · ${lead}-day lead time` : " · no supplier set") +
        ` · covers ~${TARGET_COVERAGE_DAYS} days`
      : `At/below reorder level of ${safety} ${product.unit} · no recent sales`;

  return {
    product,
    supplier,
    suggestedQty,
    reorderPoint,
    orderUpTo,
    orderByDate,
    daysUntilOrderBy,
    urgency,
    estimatedCost: suggestedQty * product.costPrice,
    reason,
  };
}

/**
 * Build the full plan: every product needing a reorder, grouped into one
 * purchase order per supplier, sorted most-urgent-first.
 */
export function buildRestockPlan(
  products: EnrichedProduct[],
  suppliers: Supplier[],
  now: number = Date.now()
): RestockPlan {
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const suggestions: RestockSuggestion[] = [];
  for (const p of products) {
    const supplier = p.supplierId ? supplierById.get(p.supplierId) ?? null : null;
    const s = suggestRestock(p, supplier, now);
    if (s) suggestions.push(s);
  }

  const byUrgencyThenSoonest = (a: RestockSuggestion, b: RestockSuggestion) =>
    URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
    (a.daysUntilOrderBy ?? 9999) - (b.daysUntilOrderBy ?? 9999);

  suggestions.sort(byUrgencyThenSoonest);

  // Group into purchase orders keyed by supplier ("__none__" for unassigned).
  const groups = new Map<string, RestockSuggestion[]>();
  for (const s of suggestions) {
    const key = s.supplier?.id ?? "__none__";
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }

  const purchaseOrders: PurchaseOrder[] = Array.from(groups.values()).map(
    (lines) => {
      const withDate = lines
        .map((l) => l.orderByDate)
        .filter((d): d is number => d != null);
      const earliestOrderBy = withDate.length ? Math.min(...withDate) : null;
      const urgency = lines.reduce<RestockUrgency>(
        (worst, l) =>
          URGENCY_RANK[l.urgency] < URGENCY_RANK[worst] ? l.urgency : worst,
        "planned"
      );
      return {
        supplier: lines[0].supplier,
        lines,
        estimatedCost: lines.reduce((sum, l) => sum + l.estimatedCost, 0),
        earliestOrderBy,
        urgency,
      };
    }
  );

  purchaseOrders.sort(
    (a, b) =>
      URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
      (a.earliestOrderBy ?? Infinity) - (b.earliestOrderBy ?? Infinity)
  );

  return {
    suggestions,
    purchaseOrders,
    totalCost: suggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
    totalItems: suggestions.length,
  };
}

export function restockUrgencyDisplay(urgency: RestockUrgency): {
  tone: "danger" | "warning" | "info";
  label: string;
} {
  switch (urgency) {
    case "overdue":
      return { tone: "danger", label: "Order now" };
    case "soon":
      return { tone: "warning", label: "Order soon" };
    default:
      return { tone: "info", label: "Planned" };
  }
}

/**
 * A WhatsApp/email-ready purchase order. `quantities` lets the screen override
 * the suggested amounts with whatever the owner edited before sending.
 */
export function buildPurchaseOrderText(
  po: PurchaseOrder,
  quantities: Record<string, number>,
  opts: { storeName?: string; now?: number } = {}
): string {
  const storeName = opts.storeName ?? "StockSage";
  const dateStr = new Date(opts.now ?? Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [];
  lines.push(`*Purchase Order — ${storeName}*`);
  lines.push(`Supplier: ${po.supplier?.name ?? "Unassigned"}`);
  lines.push(`Date: ${dateStr}`);
  lines.push("");

  let total = 0;
  for (const l of po.lines) {
    const qty = quantities[l.product.id] ?? l.suggestedQty;
    if (qty <= 0) continue;
    total += qty * l.product.costPrice;
    lines.push(
      `• ${l.product.name} (${l.product.sku}) — ${qty} ${l.product.unit}`
    );
  }

  lines.push("");
  lines.push(`Estimated total: ${currency(total)}`);
  lines.push("");
  lines.push("Sent via StockSage");
  return lines.join("\n");
}
