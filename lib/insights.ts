// Insight layer — turns the prices you already store into money answers.
//
// The app records costPrice, sellingPrice, quantity and a stock-out history.
// From those alone we can answer the questions a spreadsheet makes you compute
// by hand: what am I actually earning, which products carry the business, which
// ones make almost nothing, and how much cash is frozen in stock that won't move.

import { EnrichedProduct, Transaction } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Sales metrics are measured over this trailing window.
export const INSIGHT_WINDOW_DAYS = 30;
// No sale in this many days (with stock on hand) = dead stock.
export const DEAD_STOCK_DAYS = 21;
// Margin at/below this fraction is flagged "thin".
export const LOW_MARGIN_PCT = 0.18;

export type MarginHealth = "loss" | "thin" | "healthy";

export interface ProductInsight {
  product: EnrichedProduct;
  unitMargin: number; // sellingPrice − costPrice
  marginPct: number; // unitMargin / sellingPrice, 0..1 (can be negative)
  marginHealth: MarginHealth;
  unitsSold: number; // over the window
  revenue: number; // unitsSold × sellingPrice
  realizedProfit: number; // unitsSold × unitMargin (profit actually earned)
  potentialProfit: number; // quantity × unitMargin (profit locked in current stock)
  daysSinceLastSale: number | null; // null = never sold
  isDeadStock: boolean;
}

export interface Insights {
  windowDays: number;
  totalRevenue: number;
  totalRealizedProfit: number;
  overallMarginPct: number; // profit / revenue across the whole shop
  potentialProfitInStock: number;
  deadStockValue: number; // capital (at cost) frozen in dead stock
  deadStockCount: number;
  topPerformers: ProductInsight[]; // most profit earned, window
  thinMargins: ProductInsight[]; // loss-makers + thinnest margins
  deadStock: ProductInsight[]; // stock on hand, no recent sales
  byProduct: ProductInsight[]; // everything, most-profitable first
}

function marginHealthOf(marginPct: number): MarginHealth {
  if (marginPct < 0) return "loss";
  if (marginPct < LOW_MARGIN_PCT) return "thin";
  return "healthy";
}

export function buildInsights(
  products: EnrichedProduct[],
  transactions: Transaction[],
  now: number = Date.now(),
  windowDays: number = INSIGHT_WINDOW_DAYS
): Insights {
  const windowStart = now - windowDays * DAY_MS;

  // One pass over transactions: units sold in-window + last-sale timestamp ever.
  const soldInWindow = new Map<string, number>();
  const lastSale = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "stock-out") continue;
    if (t.timestamp >= windowStart) {
      soldInWindow.set(t.productId, (soldInWindow.get(t.productId) ?? 0) + t.quantity);
    }
    const prev = lastSale.get(t.productId);
    if (prev == null || t.timestamp > prev) lastSale.set(t.productId, t.timestamp);
  }

  const byProduct: ProductInsight[] = products.map((p) => {
    const unitMargin = p.sellingPrice - p.costPrice;
    const marginPct = p.sellingPrice > 0 ? unitMargin / p.sellingPrice : 0;
    const unitsSold = soldInWindow.get(p.id) ?? 0;
    const last = lastSale.get(p.id) ?? null;
    const daysSinceLastSale =
      last == null ? null : Math.floor((now - last) / DAY_MS);
    const isDeadStock =
      p.quantity > 0 &&
      (daysSinceLastSale == null || daysSinceLastSale >= DEAD_STOCK_DAYS);

    return {
      product: p,
      unitMargin,
      marginPct,
      marginHealth: marginHealthOf(marginPct),
      unitsSold,
      revenue: unitsSold * p.sellingPrice,
      realizedProfit: unitsSold * unitMargin,
      potentialProfit: p.quantity * unitMargin,
      daysSinceLastSale,
      isDeadStock,
    };
  });

  const totalRevenue = byProduct.reduce((s, i) => s + i.revenue, 0);
  const totalRealizedProfit = byProduct.reduce((s, i) => s + i.realizedProfit, 0);
  const deadStock = byProduct
    .filter((i) => i.isDeadStock)
    .sort((a, b) => b.product.stockValue - a.product.stockValue);

  return {
    windowDays,
    totalRevenue,
    totalRealizedProfit,
    overallMarginPct: totalRevenue > 0 ? totalRealizedProfit / totalRevenue : 0,
    potentialProfitInStock: byProduct.reduce((s, i) => s + i.potentialProfit, 0),
    deadStockValue: deadStock.reduce((s, i) => s + i.product.stockValue, 0),
    deadStockCount: deadStock.length,
    topPerformers: byProduct
      .filter((i) => i.realizedProfit > 0)
      .sort((a, b) => b.realizedProfit - a.realizedProfit)
      .slice(0, 5),
    thinMargins: byProduct
      .filter((i) => i.marginHealth !== "healthy")
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 5),
    deadStock,
    byProduct: byProduct.sort((a, b) => b.realizedProfit - a.realizedProfit),
  };
}
