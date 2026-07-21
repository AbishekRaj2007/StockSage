import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Badge, Button, Card, EmptyState } from "../components/ui";
import { useData } from "../lib/store";
import { colors, font, radius, spacing } from "../lib/theme";
import { compactCurrency, currency, dayMonth } from "../lib/format";
import {
  buildPurchaseOrderText,
  PurchaseOrder,
  RestockSuggestion,
  restockUrgencyDisplay,
} from "../lib/restock";

function orderByLabel(s: RestockSuggestion): string {
  if (s.orderByDate == null) return "ASAP";
  if (s.daysUntilOrderBy != null && s.daysUntilOrderBy <= 0) return "Overdue";
  return `by ${dayMonth(s.orderByDate)}`;
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const step = (delta: number) => onChange(Math.max(0, value + delta));
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => step(-1)}
        style={styles.stepBtn}
        hitSlop={6}
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={16} color={colors.primary} />
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => {
          const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        keyboardType="number-pad"
        style={styles.stepInput}
        selectTextOnFocus
      />
      <Pressable
        onPress={() => step(1)}
        style={styles.stepBtn}
        hitSlop={6}
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export default function RestockScreen() {
  const router = useRouter();
  const { restockPlan, receiveStock } = useData();
  const { purchaseOrders, totalItems, totalCost } = restockPlan;

  // Per-product quantity overrides. Suggestions are the default; the owner can
  // tweak any line before sharing or receiving.
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const qtyFor = (s: RestockSuggestion) =>
    overrides[s.product.id] ?? s.suggestedQty;
  const setQty = (id: string, v: number) =>
    setOverrides((prev) => ({ ...prev, [id]: v }));

  const supplierCount = purchaseOrders.length;
  const liveTotal = useMemo(
    () =>
      purchaseOrders.reduce(
        (sum, po) =>
          sum +
          po.lines.reduce((s, l) => s + qtyFor(l) * l.product.costPrice, 0),
        0
      ),
    [purchaseOrders, overrides]
  );

  const shareOrder = async (po: PurchaseOrder) => {
    try {
      await Share.share({
        message: buildPurchaseOrderText(po, overrides),
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const receiveOrder = (po: PurchaseOrder) => {
    const items = po.lines
      .map((l) => ({ productId: l.product.id, quantity: qtyFor(l) }))
      .filter((it) => it.quantity > 0);
    if (items.length === 0) return;

    const units = items.reduce((s, it) => s + it.quantity, 0);
    Alert.alert(
      "Mark as received?",
      `Add ${units} units across ${items.length} product(s) from ${
        po.supplier?.name ?? "this order"
      } into stock.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Receive",
          onPress: () => {
            receiveStock(items, `Received from ${po.supplier?.name ?? "supplier"}`);
            setOverrides((prev) => {
              const next = { ...prev };
              for (const it of items) delete next[it.productId];
              return next;
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="cart" size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          {totalItems === 0 ? (
            <>
              <Text style={styles.heroValue}>All stocked up</Text>
              <Text style={styles.heroSub}>
                Nothing has hit its reorder point yet.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroValue}>
                {totalItems} item{totalItems === 1 ? "" : "s"} to reorder
              </Text>
              <Text style={styles.heroSub}>
                Across {supplierCount} supplier{supplierCount === 1 ? "" : "s"} ·{" "}
                est. {compactCurrency(liveTotal || totalCost)}
              </Text>
            </>
          )}
        </View>
      </View>

      {purchaseOrders.length === 0 ? (
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="No reorders needed"
          message="Every product is above its reorder point for its supplier's lead time. Check back as stock moves."
          action={
            <Button
              label="Back to dashboard"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />
      ) : (
        purchaseOrders.map((po) => {
          const u = restockUrgencyDisplay(po.urgency);
          const subtotal = po.lines.reduce(
            (s, l) => s + qtyFor(l) * l.product.costPrice,
            0
          );
          const lead = po.supplier?.leadTimeDays;
          return (
            <Card
              key={po.supplier?.id ?? "__none__"}
              style={{ padding: 0, marginBottom: spacing.lg }}
            >
              {/* Supplier header */}
              <View style={styles.poHeader}>
                <View style={styles.supplierBadge}>
                  <Ionicons name="business" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supplierName} numberOfLines={1}>
                    {po.supplier?.name ?? "Unassigned products"}
                  </Text>
                  <Text style={styles.supplierMeta}>
                    {lead != null ? `${lead}-day lead time` : "No supplier set"}
                    {po.earliestOrderBy != null
                      ? ` · order by ${dayMonth(po.earliestOrderBy)}`
                      : ""}
                  </Text>
                </View>
                <Badge tone={u.tone} label={u.label} />
              </View>

              {/* Lines */}
              {po.lines.map((l) => (
                <View key={l.product.id} style={styles.line}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {l.product.name}
                    </Text>
                    <Text style={styles.lineReason} numberOfLines={2}>
                      {l.reason}
                    </Text>
                    <View style={styles.lineMetaRow}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={colors.textFaint}
                      />
                      <Text style={styles.lineMeta}>
                        {orderByLabel(l)} · {l.product.quantity} {l.product.unit}{" "}
                        left
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <QtyStepper
                      value={qtyFor(l)}
                      onChange={(v) => setQty(l.product.id, v)}
                    />
                    <Text style={styles.lineCost}>
                      {currency(qtyFor(l) * l.product.costPrice)}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Subtotal + actions */}
              <View style={styles.poFooter}>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>
                    {po.lines.length} item{po.lines.length === 1 ? "" : "s"}
                  </Text>
                  <Text style={styles.subtotalValue}>{currency(subtotal)}</Text>
                </View>
                <View style={styles.actions}>
                  <Button
                    label="Share order"
                    icon="share-outline"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => shareOrder(po)}
                  />
                  <Button
                    label="Mark received"
                    icon="checkmark"
                    style={{ flex: 1 }}
                    onPress={() => receiveOrder(po)}
                  />
                </View>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroValue: { color: colors.white, fontSize: font.h2, fontWeight: "800" },
  heroSub: { color: "#CBD5E1", fontSize: font.small, marginTop: 3 },
  poHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  supplierBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  supplierName: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  supplierMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  lineReason: {
    fontSize: font.tiny,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 15,
  },
  lineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  lineMeta: { fontSize: font.tiny, color: colors.textFaint },
  lineCost: { fontSize: font.small, fontWeight: "700", color: colors.text },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepInput: {
    minWidth: 38,
    textAlign: "center",
    fontSize: font.body,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: 0,
  },
  poFooter: { padding: spacing.lg, gap: spacing.md },
  subtotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtotalLabel: { fontSize: font.small, color: colors.textMuted },
  subtotalValue: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  actions: { flexDirection: "row", gap: spacing.md },
});
