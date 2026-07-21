// Seed data for the frontend-only build (Phase 11 "realistic demo dataset").
//
// Products + ~30 days of transactions are generated so the forecasting and
// activity features have real patterns to show — not flat/empty data.

import { Product, Transaction, Alert, AppUser } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

let seq = 0;
const id = (prefix: string) => `${prefix}_${(seq++).toString(36)}${Date.now().toString(36).slice(-3)}`;

export const DEMO_USER: AppUser = {
  uid: "demo-user",
  name: "Rohith",
  email: "rohith@stocksage.app",
  role: "admin",
  createdAt: NOW - 60 * DAY_MS,
};

// --- Products -------------------------------------------------------------

interface Seed {
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderThreshold: number;
  dailyOut: number; // avg units sold/day, drives generated stock-out history
}

const SEEDS: Seed[] = [
  { name: "Sunrise Basmati Rice 5kg", sku: "GRC-RICE-5", barcode: "8901234500017", category: "Groceries", quantity: 14, unit: "bags", costPrice: 380, sellingPrice: 520, reorderThreshold: 10, dailyOut: 3.2 },
  { name: "Amul Butter 500g", sku: "DRY-BTR-500", barcode: "8901234500024", category: "Dairy", quantity: 6, unit: "pcs", costPrice: 245, sellingPrice: 295, reorderThreshold: 12, dailyOut: 2.6 },
  { name: "Tata Salt 1kg", sku: "GRC-SALT-1", barcode: "8901234500031", category: "Groceries", quantity: 48, unit: "pcs", costPrice: 22, sellingPrice: 28, reorderThreshold: 20, dailyOut: 1.1 },
  { name: "Colgate MaxFresh 150g", sku: "PC-CLG-150", barcode: "8901234500048", category: "Personal Care", quantity: 9, unit: "pcs", costPrice: 78, sellingPrice: 99, reorderThreshold: 15, dailyOut: 1.9 },
  { name: "Maggi Noodles 12-pack", sku: "SNK-MGI-12", barcode: "8901234500055", category: "Snacks", quantity: 22, unit: "packs", costPrice: 130, sellingPrice: 168, reorderThreshold: 15, dailyOut: 4.3 },
  { name: "Coca-Cola 750ml", sku: "BEV-COK-750", barcode: "8901234500062", category: "Beverages", quantity: 31, unit: "bottles", costPrice: 32, sellingPrice: 45, reorderThreshold: 24, dailyOut: 5.1 },
  { name: "Aashirvaad Atta 10kg", sku: "GRC-ATA-10", barcode: null, category: "Groceries", quantity: 5, unit: "bags", costPrice: 470, sellingPrice: 585, reorderThreshold: 8, dailyOut: 1.4 },
  { name: "Surf Excel 1kg", sku: "HOM-SRF-1", barcode: "8901234500086", category: "Home Care", quantity: 40, unit: "pcs", costPrice: 118, sellingPrice: 145, reorderThreshold: 12, dailyOut: 0.4 },
  { name: "Dettol Handwash 200ml", sku: "PC-DTL-200", barcode: "8901234500093", category: "Personal Care", quantity: 3, unit: "pcs", costPrice: 55, sellingPrice: 72, reorderThreshold: 10, dailyOut: 1.7 },
  { name: "Britannia Good Day 600g", sku: "SNK-BGD-600", barcode: "8901234500109", category: "Snacks", quantity: 18, unit: "packs", costPrice: 95, sellingPrice: 120, reorderThreshold: 10, dailyOut: 2.1 },
];

// A little deterministic jitter so generated history looks organic but stable.
function jitter(base: number, dayIndex: number, salt: number): number {
  const wave = Math.sin((dayIndex + salt) * 1.3) * 0.5 + Math.cos((dayIndex + salt) * 0.7) * 0.3;
  const v = base * (1 + wave * 0.45);
  return Math.max(0, Math.round(v));
}

export function makeSeedData(): {
  products: Product[];
  transactions: Transaction[];
  alerts: Alert[];
} {
  const products: Product[] = [];
  const transactions: Transaction[] = [];

  SEEDS.forEach((s, i) => {
    const productId = `prod_${i + 1}`;
    products.push({
      id: productId,
      name: s.name,
      sku: s.sku,
      barcode: s.barcode,
      category: s.category,
      quantity: s.quantity,
      unit: s.unit,
      costPrice: s.costPrice,
      sellingPrice: s.sellingPrice,
      reorderThreshold: s.reorderThreshold,
      createdAt: NOW - 45 * DAY_MS,
      updatedAt: NOW - Math.floor(Math.random() * 3) * DAY_MS,
    });

    // 30 days of stock-out history + periodic restocks.
    for (let d = 30; d >= 1; d--) {
      const ts = NOW - d * DAY_MS + (i * 137 + d * 53) * 1000;
      const out = jitter(s.dailyOut, d, i);
      if (out > 0) {
        transactions.push({
          id: id("txn"),
          productId,
          type: "stock-out",
          quantity: out,
          note: null,
          userId: DEMO_USER.uid,
          timestamp: ts,
        });
      }
      // Restock roughly weekly for a couple of fast movers.
      if (d % 7 === 0 && (i === 4 || i === 5)) {
        transactions.push({
          id: id("txn"),
          productId,
          type: "stock-in",
          quantity: Math.round(s.dailyOut * 7),
          note: "Weekly restock",
          userId: DEMO_USER.uid,
          timestamp: ts + 3600 * 1000,
        });
      }
    }

    // One deliberately anomalous stock-out on the fast-moving cola (Phase 10 demo).
    if (i === 5) {
      transactions.push({
        id: id("txn"),
        productId,
        type: "stock-out",
        quantity: 40,
        note: "Bulk order",
        userId: DEMO_USER.uid,
        timestamp: NOW - 2 * DAY_MS,
      });
    }
  });

  transactions.sort((a, b) => b.timestamp - a.timestamp);
  return { products, transactions, alerts: [] };
}
