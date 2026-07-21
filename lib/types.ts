// Domain types for StockSage.
// These mirror the Firestore schema in the plan doc (Section 3), but here they
// live entirely in-memory — this is a frontend-only build with mock data.

export type UserRole = "admin" | "staff";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
}

export interface Forecast {
  avgDailyConsumption: number;
  predictedStockoutDate: number | null; // epoch ms, null when no consumption
  lastComputedAt: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  quantity: number;
  unit: string; // e.g. "pcs", "kg"
  costPrice: number;
  sellingPrice: number;
  reorderThreshold: number;
  forecast?: Forecast;
  createdAt: number;
  updatedAt: number;
}

export type TransactionType = "stock-in" | "stock-out";

export interface Transaction {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  note: string | null;
  userId: string;
  timestamp: number;
}

export type AlertType = "low-stock" | "predicted-stockout" | "anomaly";

export interface Alert {
  id: string;
  productId: string;
  type: AlertType;
  message: string;
  resolved: boolean;
  createdAt: number;
}

// Product with derived, computed fields used across the UI.
export interface EnrichedProduct extends Product {
  stockValue: number; // quantity * costPrice
  isLowStock: boolean; // quantity <= reorderThreshold
  daysUntilStockout: number | null; // derived from forecast
  urgency: "critical" | "warning" | "ok" | "unknown";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}
