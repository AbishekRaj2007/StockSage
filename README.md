# StockSage — Frontend (React Native + Expo)

AI-powered warehouse inventory management app. **This repository is the
frontend only**, built with **React Native + Expo (managed workflow) +
TypeScript + Expo Router**, and designed to run in **Expo Go** on a phone.

There is **no backend**. Everything the plan routes through Firebase / Cloud
Functions / Gemini is replaced by **in-memory mock data and local logic** so
the entire UI is fully clickable without any account, API key, or network
service. State resets on reload (it's a demo build).

---

## Run it in Expo Go

You need Node.js 18+ and a phone with the **Expo Go** app installed
(App Store / Play Store), on the **same Wi-Fi** as your computer.

```bash
cd stocksage
npm install
npx expo start
```

Then scan the QR code from the terminal with:

- **iPhone** — the Camera app (opens in Expo Go)
- **Android** — the Expo Go app's "Scan QR code"

### SDK version — pinned to Expo SDK 54

This project is **pinned to Expo SDK 54** (React Native 0.81, React 19.1) to
match the installed Expo Go app. Expo Go only runs the exact SDK it ships with,
so **do not run `npx expo install expo@latest`** — that upgrades the project
past what Expo Go supports and you'll get "project is incompatible with this
version of Expo Go" again.

If you *do* update the Expo Go app later and want to move up, change the `expo`
version in `package.json`, then realign everything and reinstall cleanly:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo install --fix
npx expo start -c
```

A clean tree matters when changing SDKs — an incremental install leaves stale
packages from the old SDK behind and produces peer-dependency conflicts.

The source only uses long-stable APIs (Expo Router, `expo-camera`'s
`CameraView`, React Native core, `@expo/vector-icons`), so an SDK change adjusts
package versions without breaking the screens.

### ⚠️ Corporate network note

If `npm install` hangs and fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or
`403 Forbidden`, you're behind a **Fortinet firewall blocking the npm
registry** (FortiGate Application Control blocks the "Npmjs" application).
No client-side config fixes this — use a different network (phone hotspot) or
ask IT to allowlist `registry.npmjs.org`. Access has been observed to be
intermittent, so it's worth simply retrying.

---

## What's implemented (mapped to the plan's phases)

| Phase | Feature | Frontend status |
|---|---|---|
| 2 | Auth (login / signup) + navigation guard | ✅ Mocked auth, real route guarding |
| 3 | Product CRUD | ✅ Add / edit / delete + validation, live list |
| 4 | Barcode / QR scanning | ✅ `expo-camera` `CameraView`, permission states, existing-vs-new routing, demo "simulate scan" |
| 5 | Stock-in / stock-out | ✅ Atomic qty + transaction, negative-stock guard, per-product history |
| 6 | Real-time dashboard | ✅ Live stats, forecast urgency, activity feed |
| 7 | Demand forecasting | ✅ Rolling-average forecast + predicted stock-out date + urgency (computed on-device) |
| 8 | AI assistant (NL queries) | ✅ Chat UI with grounded, data-computed answers to the plan's demo questions |
| 10 | Anomaly detection | ✅ Simple deviation flag surfaced on the Alerts screen |
| 11 | Demo data, empty/loading states | ✅ Seeded ~30 days of history, empty states throughout |

Backend-only phases (0, 1) and the vision-count stretch (9, needs Gemini
multimodal) are intentionally out of scope for a frontend build.

> The forecasting is **trend-based statistics (a rolling average), not a
> trained ML model** — described accurately, as the plan requires.

---

## Project structure

```
stocksage/
  app/                      # Expo Router screens
    _layout.tsx             # Providers + auth navigation guard
    (auth)/                 # login, signup
    (tabs)/                 # dashboard, products, scan, assistant, alerts
    product/[id].tsx        # product detail + transaction history
    product/form.tsx        # add / edit product (also used by scan flow)
    transaction/new.tsx     # stock-in / stock-out
  components/               # Card, Button, Badge, Field, ProductCard, ...
  lib/
    types.ts                # domain types (mirror the Firestore schema)
    theme.ts                # design tokens
    mockData.ts             # seeded products + ~30 days of transactions
    store.tsx               # in-memory data layer (stands in for Firestore)
    auth.tsx                # mock auth context
    forecast.ts             # rolling-average forecasting (Phase 7 logic)
    assistant.ts            # grounded mock answers (Phase 8 logic)
    format.ts               # currency / date helpers
```

## Demo flow

1. **Sign in** — the fields are pre-filled; any valid email + 6-char password works.
2. **Dashboard** — see total stock value, products below reorder, critical
   forecast count, and recent activity.
3. **Products** — search / filter / sort, open a product to see its forecast
   and history.
4. **Record a stock-out** — watch the quantity, dashboard, and forecast update
   live.
5. **Scan** — point at any barcode (or tap "Simulate a scan") to look up or add
   a product.
6. **Assistant** — tap a suggested question like *"If I can only restock 3 items
   this week, which should I prioritize?"* and get a data-grounded answer.
7. **Alerts** — review predicted stock-outs, low stock, and the anomaly flag.

## To make it real later

Swap `lib/store.tsx` and `lib/auth.tsx` for Firebase (Firestore `onSnapshot` +
Firebase Auth), and move `lib/forecast.ts` / `lib/assistant.ts` into Cloud
Functions (with the Gemini call server-side). The screens and types stay the
same.
