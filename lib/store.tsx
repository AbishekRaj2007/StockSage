// In-memory data layer for the frontend-only build.
//
// This React context stands in for everything the plan routes through
// Firestore + Cloud Functions: product CRUD, atomic stock transactions,
// live-recomputed forecasts, and derived alerts. State lives in memory only
// (resets on reload) — there is no backend, by design.

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert as AlertModel,
  AlertType,
  EnrichedProduct,
  Product,
  Transaction,
  TransactionType,
} from "./types";
import { makeSeedData, DEMO_USER } from "./mockData";
import {
  computeForecast,
  daysUntilStockout,
  urgencyFor,
  URGENCY_WINDOW_DAYS,
} from "./forecast";

const DAY_MS = 24 * 60 * 60 * 1000;

let counter = 0;
const newId = (p: string) =>
  `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export interface ProductInput {
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderThreshold: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  criticalCount: number;
  potentialRevenue: number;
}

interface DataContextValue {
  products: EnrichedProduct[];
  transactions: Transaction[];
  alerts: AlertModel[];
  stats: DashboardStats;
  categories: string[];
  getProduct: (id: string) => EnrichedProduct | undefined;
  getByBarcode: (barcode: string) => EnrichedProduct | undefined;
  productTransactions: (id: string) => Transaction[];
  addProduct: (input: ProductInput) => EnrichedProduct;
  updateProduct: (id: string, input: ProductInput) => void;
  deleteProduct: (id: string) => void;
  /** Records a stock movement + updates quantity together. Throws on invalid. */
  recordTransaction: (args: {
    productId: string;
    type: TransactionType;
    quantity: number;
    note?: string | null;
  }) => void;
  resolveAlert: (key: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const ANOMALY_WINDOW_DAYS = 3;

function detectAnomaly(
  product: Product,
  txns: Transaction[]
): { flagged: Transaction; z: number } | null {
  const outs = txns.filter(
    (t) => t.productId === product.id && t.type === "stock-out"
  );
  if (outs.length < 6) return null;

  const qtys = outs.map((t) => t.quantity);
  const mean = qtys.reduce((s, q) => s + q, 0) / qtys.length;
  const variance =
    qtys.reduce((s, q) => s + (q - mean) ** 2, 0) / qtys.length;
  const std = Math.sqrt(variance);
  if (std <= 0) return null;

  // Inspect recent stock-outs and flag the most extreme outlier among them.
  const since = Date.now() - ANOMALY_WINDOW_DAYS * DAY_MS;
  const recent = outs
    .filter((t) => t.timestamp >= since)
    .sort((a, b) => b.quantity - a.quantity);

  for (const t of recent) {
    const z = (t.quantity - mean) / std;
    if (z >= 2.5) return { flagged: t, z };
  }
  return null;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const seed = useMemo(() => makeSeedData(), []);
  const [products, setProducts] = useState<Product[]>(seed.products);
  const [transactions, setTransactions] = useState<Transaction[]>(
    seed.transactions
  );
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());

  // Always-current snapshot of products, used for synchronous validation in
  // recordTransaction without reaching into (possibly stale) render closures.
  const productsRef = useRef<Product[]>(products);
  productsRef.current = products;

  // Attach a freshly-computed forecast + derived fields to every product.
  const enriched: EnrichedProduct[] = useMemo(() => {
    const now = Date.now();
    return products.map((p) => {
      const forecast = computeForecast(p, transactions, now);
      const days = daysUntilStockout(forecast, now);
      return {
        ...p,
        forecast,
        stockValue: p.quantity * p.costPrice,
        isLowStock: p.quantity <= p.reorderThreshold,
        daysUntilStockout: days,
        urgency: urgencyFor(p, forecast, now),
      };
    });
  }, [products, transactions]);

  const stats: DashboardStats = useMemo(() => {
    return enriched.reduce<DashboardStats>(
      (acc, p) => {
        acc.totalProducts += 1;
        acc.totalStockValue += p.stockValue;
        acc.potentialRevenue += p.quantity * p.sellingPrice;
        if (p.isLowStock) acc.lowStockCount += 1;
        if (p.urgency === "critical") acc.criticalCount += 1;
        return acc;
      },
      {
        totalProducts: 0,
        totalStockValue: 0,
        lowStockCount: 0,
        criticalCount: 0,
        potentialRevenue: 0,
      }
    );
  }, [enriched]);

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [products]
  );

  // Derived alerts (kept live rather than persisted, since there's no backend).
  const alerts: AlertModel[] = useMemo(() => {
    const now = Date.now();
    const out: AlertModel[] = [];
    const push = (
      productId: string,
      type: AlertType,
      message: string,
      createdAt: number
    ) => {
      const key = `${type}:${productId}`;
      out.push({
        id: key,
        productId,
        type,
        message,
        resolved: resolvedKeys.has(key),
        createdAt,
      });
    };

    for (const p of enriched) {
      if (
        p.daysUntilStockout != null &&
        p.daysUntilStockout <= URGENCY_WINDOW_DAYS
      ) {
        push(
          p.id,
          "predicted-stockout",
          `${p.name} is predicted to run out in ${p.daysUntilStockout} day${
            p.daysUntilStockout === 1 ? "" : "s"
          }.`,
          now
        );
      } else if (p.isLowStock) {
        push(
          p.id,
          "low-stock",
          `${p.name} is at or below its reorder threshold (${p.quantity} ${p.unit} left).`,
          now
        );
      }

      const anomaly = detectAnomaly(p, transactions);
      if (anomaly) {
        push(
          p.id,
          "anomaly",
          `Unusual stock-out on ${p.name}: ${anomaly.flagged.quantity} ${
            p.unit
          } (${anomaly.z.toFixed(1)}σ above normal).`,
          anomaly.flagged.timestamp
        );
      }
    }

    const order: Record<AlertType, number> = {
      "predicted-stockout": 0,
      anomaly: 1,
      "low-stock": 2,
    };
    return out.sort(
      (a, b) =>
        Number(a.resolved) - Number(b.resolved) ||
        order[a.type] - order[b.type] ||
        b.createdAt - a.createdAt
    );
  }, [enriched, transactions, resolvedKeys]);

  const getProduct = useCallback(
    (id: string) => enriched.find((p) => p.id === id),
    [enriched]
  );

  const getByBarcode = useCallback(
    (barcode: string) =>
      enriched.find((p) => p.barcode && p.barcode === barcode),
    [enriched]
  );

  const productTransactions = useCallback(
    (id: string) =>
      transactions
        .filter((t) => t.productId === id)
        .sort((a, b) => b.timestamp - a.timestamp),
    [transactions]
  );

  const addProduct = useCallback((input: ProductInput) => {
    const now = Date.now();
    const product: Product = {
      id: newId("prod"),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    setProducts((prev) => [product, ...prev]);
    return {
      ...product,
      stockValue: product.quantity * product.costPrice,
      isLowStock: product.quantity <= product.reorderThreshold,
      daysUntilStockout: null,
      urgency: urgencyFor(product, undefined, now),
    };
  }, []);

  const updateProduct = useCallback((id: string, input: ProductInput) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...input, updatedAt: Date.now() } : p
      )
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.productId !== id));
  }, []);

  const recordTransaction = useCallback(
    (args: {
      productId: string;
      type: TransactionType;
      quantity: number;
      note?: string | null;
    }) => {
      const qty = Math.abs(Math.round(args.quantity));
      if (!qty || qty <= 0) {
        throw new Error("Quantity must be a positive whole number.");
      }

      // Simulates Firestore's runTransaction: validate against the latest
      // committed quantity, then write product + transaction together.
      const product = productsRef.current.find((p) => p.id === args.productId);
      if (!product) throw new Error("Product not found.");

      if (args.type === "stock-out" && product.quantity - qty < 0) {
        throw new Error(
          `Only ${product.quantity} ${product.unit} in stock — cannot remove ${qty}.`
        );
      }

      const txn: Transaction = {
        id: newId("txn"),
        productId: args.productId,
        type: args.type,
        quantity: qty,
        note: args.note?.trim() ? args.note.trim() : null,
        userId: DEMO_USER.uid,
        timestamp: Date.now(),
      };

      // Two independent functional updates keep the product quantity and its
      // transaction in lock-step even under rapid successive calls.
      setProducts((prev) =>
        prev.map((p) =>
          p.id === args.productId
            ? {
                ...p,
                quantity:
                  args.type === "stock-in"
                    ? p.quantity + qty
                    : p.quantity - qty,
                updatedAt: Date.now(),
              }
            : p
        )
      );
      setTransactions((prev) => [txn, ...prev]);
    },
    []
  );

  const resolveAlert = useCallback((key: string) => {
    setResolvedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const value: DataContextValue = {
    products: enriched,
    transactions,
    alerts,
    stats,
    categories,
    getProduct,
    getByBarcode,
    productTransactions,
    addProduct,
    updateProduct,
    deleteProduct,
    recordTransaction,
    resolveAlert,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
