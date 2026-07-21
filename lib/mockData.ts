// Seed data for the frontend-only build (Phase 11 "realistic demo dataset").
//
// Products + ~30 days of transactions are generated so the forecasting and
// activity features have real patterns to show — not flat/empty data.

import { Product, Transaction, Alert, AppUser, Supplier } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

// --- Suppliers ------------------------------------------------------------
// Vendors with realistic lead times. The Restock Copilot groups reorder
// suggestions by supplier and uses leadTimeDays to compute each "order-by" date.
export const SUPPLIERS: Supplier[] = [
  { id: "sup_metro", name: "Metro Wholesale Distributors", leadTimeDays: 2, contact: "+91 98450 11223" },
  { id: "sup_dairy", name: "FreshDairy Supply Co.", leadTimeDays: 1, contact: "+91 98860 44557" },
  { id: "sup_fmcg", name: "Prime FMCG Traders", leadTimeDays: 3, contact: "+91 90080 77661" },
  { id: "sup_bev", name: "CoolBev Beverages", leadTimeDays: 2, contact: "+91 99000 33445" },
];

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
  supplierId: string;
  dailyOut: number; // avg units sold/day, drives generated stock-out history
}

const SEEDS: Seed[] = [
  { name: "Sunrise Basmati Rice 5kg", sku: "GRC-RICE-5", barcode: "8901234500017", category: "Groceries", quantity: 14, unit: "bags", costPrice: 380, sellingPrice: 520, reorderThreshold: 10, supplierId: "sup_metro", dailyOut: 3.2 },
  { name: "Amul Butter 500g", sku: "DRY-BTR-500", barcode: "8901234500024", category: "Dairy", quantity: 6, unit: "pcs", costPrice: 245, sellingPrice: 295, reorderThreshold: 12, supplierId: "sup_dairy", dailyOut: 2.6 },
  { name: "Tata Salt 1kg", sku: "GRC-SALT-1", barcode: "8901234500031", category: "Groceries", quantity: 48, unit: "pcs", costPrice: 22, sellingPrice: 28, reorderThreshold: 20, supplierId: "sup_metro", dailyOut: 1.1 },
  { name: "Colgate MaxFresh 150g", sku: "PC-CLG-150", barcode: "8901234500048", category: "Personal Care", quantity: 9, unit: "pcs", costPrice: 78, sellingPrice: 99, reorderThreshold: 15, supplierId: "sup_fmcg", dailyOut: 1.9 },
  { name: "Maggi Noodles 12-pack", sku: "SNK-MGI-12", barcode: "8901234500055", category: "Snacks", quantity: 22, unit: "packs", costPrice: 130, sellingPrice: 168, reorderThreshold: 15, supplierId: "sup_fmcg", dailyOut: 4.3 },
  { name: "Coca-Cola 750ml", sku: "BEV-COK-750", barcode: "8901234500062", category: "Beverages", quantity: 31, unit: "bottles", costPrice: 32, sellingPrice: 45, reorderThreshold: 24, supplierId: "sup_bev", dailyOut: 5.1 },
  { name: "Aashirvaad Atta 10kg", sku: "GRC-ATA-10", barcode: null, category: "Groceries", quantity: 5, unit: "bags", costPrice: 470, sellingPrice: 585, reorderThreshold: 8, supplierId: "sup_metro", dailyOut: 1.4 },
  { name: "Surf Excel 1kg", sku: "HOM-SRF-1", barcode: "8901234500086", category: "Home Care", quantity: 40, unit: "pcs", costPrice: 118, sellingPrice: 145, reorderThreshold: 12, supplierId: "sup_fmcg", dailyOut: 0.4 },
  { name: "Dettol Handwash 200ml", sku: "PC-DTL-200", barcode: "8901234500093", category: "Personal Care", quantity: 3, unit: "pcs", costPrice: 55, sellingPrice: 72, reorderThreshold: 10, supplierId: "sup_fmcg", dailyOut: 1.7 },
  { name: "Britannia Good Day 600g", sku: "SNK-BGD-600", barcode: "8901234500109", category: "Snacks", quantity: 18, unit: "packs", costPrice: 95, sellingPrice: 120, reorderThreshold: 10, supplierId: "sup_fmcg", dailyOut: 2.1 },
  // High volume, razor-thin margin (~9.5%) — surfaces in Insights as a low-margin mover.
  { name: "Fresh Bread Loaf 400g", sku: "BKY-BRD-400", barcode: null, category: "Bakery", quantity: 20, unit: "loaves", costPrice: 38, sellingPrice: 42, reorderThreshold: 15, supplierId: "sup_metro", dailyOut: 6.0 },
  // Healthy margin but zero sales — surfaces in Insights as dead stock (capital frozen).
  { name: "Festive Gift Hamper", sku: "GEN-HMP-01", barcode: null, category: "General", quantity: 18, unit: "boxes", costPrice: 450, sellingPrice: 599, reorderThreshold: 4, supplierId: "sup_metro", dailyOut: 0 },
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
      supplierId: s.supplierId,
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
