import React from "react";
import { EnrichedProduct } from "../lib/types";
import { Badge, BadgeTone } from "./ui";

export function urgencyDisplay(p: EnrichedProduct): {
  tone: BadgeTone;
  label: string;
  icon: "alert-circle" | "warning" | "checkmark-circle" | "help-circle";
} {
  switch (p.urgency) {
    case "critical":
      return {
        tone: "danger",
        label:
          p.daysUntilStockout != null
            ? `${p.daysUntilStockout}d left`
            : "Out of stock",
        icon: "alert-circle",
      };
    case "warning":
      return {
        tone: "warning",
        label:
          p.daysUntilStockout != null
            ? `${p.daysUntilStockout}d left`
            : "Low stock",
        icon: "warning",
      };
    case "ok":
      return { tone: "success", label: "Healthy", icon: "checkmark-circle" };
    default:
      return { tone: "neutral", label: "No forecast", icon: "help-circle" };
  }
}

export function UrgencyBadge({ product }: { product: EnrichedProduct }) {
  const d = urgencyDisplay(product);
  return <Badge tone={d.tone} label={d.label} icon={d.icon} />;
}
