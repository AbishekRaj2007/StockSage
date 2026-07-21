// Mock AI assistant (Phase 8), frontend-only.
//
// In the real app a Cloud Function fetches Firestore data, builds a grounded
// prompt, and calls the Gemini API. Here we replicate the *grounding* — every
// answer is computed from the actual in-memory products/transactions, so it
// never fabricates names or numbers — using lightweight intent matching
// instead of a live LLM call. Responses are intentionally deterministic so
// the fixed demo questions are reliable.

import { EnrichedProduct, Transaction } from "./types";
import { currency } from "./format";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SUGGESTED_QUESTIONS = [
  "Which products are running low?",
  "If I can only restock 3 items this week, which should I prioritize and why?",
  "What did we sell the most of last week?",
  "Which products are barely moving?",
  "What's my total stock value?",
];

interface Ctx {
  products: EnrichedProduct[];
  transactions: Transaction[];
}

function unitsSoldSince(
  productId: string,
  transactions: Transaction[],
  since: number
): number {
  return transactions
    .filter(
      (t) =>
        t.productId === productId &&
        t.type === "stock-out" &&
        t.timestamp >= since
    )
    .reduce((s, t) => s + t.quantity, 0);
}

function runningLow(ctx: Ctx): string {
  const low = ctx.products
    .filter((p) => p.urgency === "critical" || p.urgency === "warning" || p.isLowStock)
    .sort((a, b) => (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999));

  if (low.length === 0) {
    return "Good news — nothing is running low right now. Every product is above its reorder threshold with a healthy forecast.";
  }

  const lines = low.map((p) => {
    const eta =
      p.daysUntilStockout != null
        ? `~${p.daysUntilStockout} day(s) of stock left`
        : `${p.quantity} ${p.unit} left (at/under threshold of ${p.reorderThreshold})`;
    return `• ${p.name} — ${p.quantity} ${p.unit}, ${eta}`;
  });

  return `${low.length} product(s) need attention:\n\n${lines.join(
    "\n"
  )}\n\nThe ones with the fewest days of stock left are the most urgent.`;
}

function prioritizeRestock(ctx: Ctx): string {
  const ranked = [...ctx.products]
    .filter((p) => p.daysUntilStockout != null || p.isLowStock)
    .sort((a, b) => (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999))
    .slice(0, 3);

  if (ranked.length === 0) {
    return "Nothing is urgent enough to prioritize this week — stock levels and forecasts all look healthy.";
  }

  const lines = ranked.map((p, i) => {
    const why =
      p.daysUntilStockout != null
        ? `predicted to run out in ~${p.daysUntilStockout} day(s) at the current sell-through of ${p.forecast?.avgDailyConsumption.toFixed(
            1
          )} ${p.unit}/day`
        : `only ${p.quantity} ${p.unit} left, at/under its reorder threshold`;
    return `${i + 1}. ${p.name} — ${why}.`;
  });

  return `If you can only restock 3 items this week, prioritize these, in order:\n\n${lines.join(
    "\n"
  )}\n\nRanking is by how soon each is projected to hit zero, so restocking these first minimizes the chance of a stock-out.`;
}

function bestSellersLastWeek(ctx: Ctx): string {
  const since = Date.now() - 7 * DAY_MS;
  const ranked = ctx.products
    .map((p) => ({ p, sold: unitsSoldSince(p.id, ctx.transactions, since) }))
    .filter((r) => r.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  if (ranked.length === 0) {
    return "There were no stock-out transactions in the last 7 days.";
  }

  const lines = ranked.map(
    (r) => `• ${r.p.name} — ${r.sold} ${r.p.unit} sold`
  );
  return `Top sellers over the last 7 days:\n\n${lines.join("\n")}\n\n${
    ranked[0].p.name
  } moved the most, at ${ranked[0].sold} ${ranked[0].p.unit}.`;
}

function slowMovers(ctx: Ctx): string {
  const since = Date.now() - 14 * DAY_MS;
  const ranked = ctx.products
    .map((p) => ({ p, sold: unitsSoldSince(p.id, ctx.transactions, since) }))
    .sort((a, b) => a.sold - b.sold)
    .slice(0, 5);

  const lines = ranked.map(
    (r) =>
      `• ${r.p.name} — ${r.sold} ${r.p.unit} sold in 14 days, ${r.p.quantity} ${r.p.unit} still on hand`
  );
  return `These are your slowest movers over the last 14 days:\n\n${lines.join(
    "\n"
  )}\n\nThese tie up capital without selling — consider a promotion before ordering more.`;
}

function stockValue(ctx: Ctx): string {
  const totalCost = ctx.products.reduce((s, p) => s + p.stockValue, 0);
  const totalRetail = ctx.products.reduce(
    (s, p) => s + p.quantity * p.sellingPrice,
    0
  );
  return `You currently hold ${ctx.products.length} products.\n\n• Stock value (at cost): ${currency(
    totalCost
  )}\n• Potential revenue (at selling price): ${currency(
    totalRetail
  )}\n• Projected gross margin: ${currency(totalRetail - totalCost)}`;
}

function anomalies(ctx: Ctx): string {
  // Reuse the same simple deviation idea used for alerts.
  const since = Date.now() - 3 * DAY_MS;
  const recentBig = ctx.transactions
    .filter((t) => t.type === "stock-out" && t.timestamp >= since && t.quantity >= 20)
    .map((t) => {
      const p = ctx.products.find((x) => x.id === t.productId);
      return p ? `• ${p.name} — ${t.quantity} ${p.unit} in a single stock-out` : null;
    })
    .filter(Boolean);

  if (recentBig.length === 0) {
    return "No unusual stock-out patterns in the last few days — everything is within normal range.";
  }
  return `These recent stock-outs are larger than usual and worth a quick check:\n\n${recentBig.join(
    "\n"
  )}`;
}

function overview(ctx: Ctx): string {
  const critical = ctx.products.filter((p) => p.urgency === "critical").length;
  const low = ctx.products.filter((p) => p.isLowStock).length;
  return `I answer questions about your live inventory. Right now you have ${ctx.products.length} products, ${low} at/under their reorder threshold and ${critical} in a critical forecast window.\n\nTry asking:\n• Which products are running low?\n• If I can only restock 3 items this week, which should I prioritize?\n• What did we sell the most of last week?\n• Which products are barely moving?`;
}

/**
 * Returns a grounded answer string for a natural-language question.
 * Deterministic and computed entirely from `ctx` — no network, no fabrication.
 */
export function answerQuestion(question: string, ctx: Ctx): string {
  const q = question.toLowerCase();

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("restock", "prioritize", "priorit", "3 item", "three item"))
    return prioritizeRestock(ctx);
  if (has("running low", "run low", "low stock", "running out", "reorder"))
    return runningLow(ctx);
  if (has("most", "best sell", "top sell", "sold the most", "selling"))
    return bestSellersLastWeek(ctx);
  if (has("barely", "slow", "not moving", "dead stock", "stagnant"))
    return slowMovers(ctx);
  if (has("value", "worth", "capital", "margin", "revenue"))
    return stockValue(ctx);
  if (has("anomal", "unusual", "theft", "loss", "strange", "weird"))
    return anomalies(ctx);
  if (has("help", "what can you", "hello", "hi ", "hey"))
    return overview(ctx);

  // Fallback: still grounded, points back to what it can answer.
  return `I couldn't map that to a specific report, but here's a quick snapshot:\n\n${overview(
    ctx
  )}`;
}
