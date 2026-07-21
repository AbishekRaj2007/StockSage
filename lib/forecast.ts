// Trend-based demand forecasting (Phase 7).
//
// This is deliberately simple statistics — a rolling average — NOT a trained
// ML model, exactly as the plan describes. In the real app this runs in a
// Cloud Function; here it runs on-device against the mock transactions so the
// frontend can display predicted stock-out dates and urgency.

import { Product, Transaction, Forecast } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const FORECAST_WINDOW_DAYS = 30;
export const URGENCY_WINDOW_DAYS = 7;

/**
 * Compute a product's forecast from its stock-out history over a rolling window.
 * Handles the zero-consumption case without dividing by zero.
 */
export function computeForecast(
  product: Product,
  transactions: Transaction[],
  now: number = Date.now(),
  windowDays: number = FORECAST_WINDOW_DAYS
): Forecast {
  const windowStart = now - windowDays * DAY_MS;

  const consumed = transactions
    .filter(
      (t) =>
        t.productId === product.id &&
        t.type === "stock-out" &&
        t.timestamp >= windowStart
    )
    .reduce((sum, t) => sum + t.quantity, 0);

  const avgDailyConsumption = consumed / windowDays;

  let predictedStockoutDate: number | null = null;
  if (avgDailyConsumption > 0 && product.quantity > 0) {
    const daysLeft = product.quantity / avgDailyConsumption;
    predictedStockoutDate = now + daysLeft * DAY_MS;
  }

  return {
    avgDailyConsumption,
    predictedStockoutDate,
    lastComputedAt: now,
  };
}

/** Whole days from `now` until the predicted stock-out (null when no forecast). */
export function daysUntilStockout(
  forecast: Forecast | undefined,
  now: number = Date.now()
): number | null {
  if (!forecast || forecast.predictedStockoutDate == null) return null;
  return Math.max(
    0,
    Math.round((forecast.predictedStockoutDate - now) / DAY_MS)
  );
}

export type Urgency = "critical" | "warning" | "ok" | "unknown";

/**
 * Urgency blends the predictive signal (days until stock-out) with the static
 * reorder threshold fallback, so a product still flags even before it has
 * enough history to forecast.
 */
export function urgencyFor(
  product: Product,
  forecast: Forecast | undefined,
  now: number = Date.now()
): Urgency {
  const days = daysUntilStockout(forecast, now);

  if (days != null) {
    if (days <= 3) return "critical";
    if (days <= URGENCY_WINDOW_DAYS) return "warning";
    if (product.quantity <= product.reorderThreshold) return "warning";
    return "ok";
  }

  // No forecast yet — fall back to the static threshold.
  if (product.quantity <= 0) return "critical";
  if (product.quantity <= product.reorderThreshold) return "warning";
  return "unknown";
}
