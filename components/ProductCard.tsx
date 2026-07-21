import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EnrichedProduct } from "../lib/types";
import { colors, font, radius, spacing } from "../lib/theme";
import { currency } from "../lib/format";
import { UrgencyBadge } from "./UrgencyBadge";

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Groceries: "basket-outline",
  Dairy: "nutrition-outline",
  Snacks: "fast-food-outline",
  Beverages: "wine-outline",
  "Personal Care": "sparkles-outline",
  "Home Care": "home-outline",
};

export function ProductCard({
  product,
  onPress,
}: {
  product: EnrichedProduct;
  onPress?: () => void;
}) {
  const icon = CATEGORY_ICON[product.category] ?? "cube-outline";
  const barColor =
    product.urgency === "critical"
      ? colors.danger
      : product.urgency === "warning"
      ? colors.warning
      : product.urgency === "ok"
      ? colors.success
      : colors.textFaint;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.accent, { backgroundColor: barColor }]} />
      <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {product.sku} · {product.category}
        </Text>
        <View style={styles.footer}>
          <UrgencyBadge product={product} />
          <Text style={styles.value}>{currency(product.stockValue)}</Text>
        </View>
      </View>

      <View style={styles.qtyCol}>
        <Text style={[styles.qty, { color: barColor }]}>
          {product.quantity}
        </Text>
        <Text style={styles.unit}>{product.unit}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  name: {
    fontSize: font.body,
    fontWeight: "700",
    color: colors.text,
  },
  meta: {
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontSize: font.small,
    fontWeight: "600",
    color: colors.textMuted,
  },
  qtyCol: {
    alignItems: "center",
    marginLeft: spacing.sm,
    minWidth: 46,
  },
  qty: {
    fontSize: font.h2,
    fontWeight: "800",
  },
  unit: {
    fontSize: font.tiny,
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
