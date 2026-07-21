import { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Badge, Button, Card, SectionTitle } from "../../components/ui";
import { UrgencyBadge, urgencyDisplay } from "../../components/UrgencyBadge";
import { useData } from "../../lib/store";
import { colors, font, radius, spacing } from "../../lib/theme";
import { currency, relativeTime, shortDate } from "../../lib/format";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getProduct, productTransactions, deleteProduct } = useData();
  const product = getProduct(id);
  const txns = useMemo(
    () => (product ? productTransactions(product.id) : []),
    [product, productTransactions]
  );

  if (!product) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: "Product" }} />
        <Ionicons name="cube-outline" size={40} color={colors.textFaint} />
        <Text style={styles.missingText}>This product no longer exists.</Text>
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const urg = urgencyDisplay(product);
  const forecast = product.forecast;

  const onDelete = () => {
    Alert.alert(
      "Delete product",
      `Delete "${product.name}"? This also removes its transaction history. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteProduct(product.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Stack.Screen options={{ title: product.name }} />

      {/* Hero */}
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.sku}>
              {product.sku} · {product.category}
            </Text>
          </View>
          <UrgencyBadge product={product} />
        </View>

        <View style={styles.qtyBlock}>
          <View>
            <Text style={styles.qtyValue}>
              {product.quantity}
              <Text style={styles.qtyUnit}> {product.unit}</Text>
            </Text>
            <Text style={styles.qtyLabel}>on hand</Text>
          </View>
          <View style={styles.qtyDivider} />
          <View>
            <Text style={styles.qtyValueSm}>{currency(product.stockValue)}</Text>
            <Text style={styles.qtyLabel}>stock value</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button
            label="Stock In"
            icon="arrow-down"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() =>
              router.push(`/transaction/new?productId=${product.id}&type=stock-in`)
            }
          />
          <Button
            label="Stock Out"
            icon="arrow-up"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() =>
              router.push(`/transaction/new?productId=${product.id}&type=stock-out`)
            }
          />
        </View>
      </Card>

      {/* Forecast card */}
      <View style={styles.section}>
        <SectionTitle>Demand forecast</SectionTitle>
        <Card>
          <View style={styles.forecastHead}>
            <View
              style={[
                styles.forecastIcon,
                {
                  backgroundColor:
                    urg.tone === "danger"
                      ? colors.dangerSoft
                      : urg.tone === "warning"
                      ? colors.warningSoft
                      : urg.tone === "success"
                      ? colors.successSoft
                      : "#F1F5F9",
                },
              ]}
            >
              <Ionicons
                name="analytics"
                size={20}
                color={
                  urg.tone === "danger"
                    ? colors.danger
                    : urg.tone === "warning"
                    ? colors.warning
                    : urg.tone === "success"
                    ? colors.success
                    : colors.textMuted
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.forecastTitle}>
                {product.daysUntilStockout != null
                  ? `~${product.daysUntilStockout} days of stock left`
                  : "Not enough sales to forecast"}
              </Text>
              <Text style={styles.forecastSub}>
                {forecast && forecast.predictedStockoutDate
                  ? `Predicted stock-out: ${shortDate(
                      forecast.predictedStockoutDate
                    )}`
                  : "Add stock-out history to enable a prediction"}
              </Text>
            </View>
          </View>

          <View style={styles.forecastStats}>
            <View style={styles.fStat}>
              <Text style={styles.fStatValue}>
                {forecast ? forecast.avgDailyConsumption.toFixed(1) : "0.0"}
              </Text>
              <Text style={styles.fStatLabel}>avg {product.unit}/day</Text>
            </View>
            <View style={styles.fStat}>
              <Text style={styles.fStatValue}>{product.reorderThreshold}</Text>
              <Text style={styles.fStatLabel}>reorder at</Text>
            </View>
            <View style={styles.fStat}>
              <Badge tone={urg.tone} label={urg.label} icon={urg.icon} />
            </View>
          </View>

          <Text style={styles.forecastNote}>
            Trend-based estimate from the last 30 days of stock-out history —
            not a machine-learning model.
          </Text>
        </Card>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <SectionTitle>Details</SectionTitle>
        <Card>
          <InfoRow label="Cost price" value={currency(product.costPrice)} />
          <InfoRow label="Selling price" value={currency(product.sellingPrice)} />
          <InfoRow
            label="Margin / unit"
            value={currency(product.sellingPrice - product.costPrice)}
          />
          <InfoRow label="Barcode" value={product.barcode ?? "—"} />
          <InfoRow label="Updated" value={relativeTime(product.updatedAt)} />
        </Card>
      </View>

      {/* Transaction history */}
      <View style={styles.section}>
        <SectionTitle>Transaction history</SectionTitle>
        <Card style={{ padding: 0 }}>
          {txns.length === 0 ? (
            <Text style={styles.emptyTxn}>No transactions recorded yet.</Text>
          ) : (
            txns.slice(0, 20).map((t, i) => {
              const isIn = t.type === "stock-in";
              return (
                <View
                  key={t.id}
                  style={[
                    styles.txnRow,
                    i < Math.min(txns.length, 20) - 1 && styles.txnDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.txnIcon,
                      {
                        backgroundColor: isIn
                          ? colors.successSoft
                          : colors.dangerSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isIn ? "arrow-down" : "arrow-up"}
                      size={15}
                      color={isIn ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnType}>
                      {isIn ? "Stock in" : "Stock out"}
                    </Text>
                    <Text style={styles.txnMeta}>
                      {relativeTime(t.timestamp)}
                      {t.note ? ` · ${t.note}` : ""}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txnQty,
                      { color: isIn ? colors.success : colors.danger },
                    ]}
                  >
                    {isIn ? "+" : "−"}
                    {t.quantity}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </View>

      {/* Manage */}
      <View style={[styles.section, styles.manageRow]}>
        <Button
          label="Edit"
          icon="create-outline"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => router.push(`/product/form?id=${product.id}`)}
        />
        <Button
          label="Delete"
          icon="trash-outline"
          variant="danger"
          style={{ flex: 1 }}
          onPress={onDelete}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  missingText: { fontSize: font.body, color: colors.textMuted },
  hero: { gap: spacing.lg },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  name: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  sku: { fontSize: font.small, color: colors.textMuted, marginTop: 4 },
  qtyBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  qtyValue: { fontSize: 32, fontWeight: "800", color: colors.text },
  qtyValueSm: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  qtyUnit: { fontSize: font.body, fontWeight: "600", color: colors.textMuted },
  qtyLabel: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  qtyDivider: { width: 1, height: 36, backgroundColor: colors.border },
  actionRow: { flexDirection: "row", gap: spacing.md },
  section: { marginTop: spacing.xl },
  forecastHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  forecastIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  forecastTitle: { fontSize: font.body, fontWeight: "700", color: colors.text },
  forecastSub: { fontSize: font.small, color: colors.textMuted, marginTop: 3 },
  forecastStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  fStat: { alignItems: "flex-start" },
  fStatValue: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  fStatLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  forecastNote: {
    marginTop: spacing.lg,
    fontSize: font.tiny,
    color: colors.textFaint,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  infoLabel: { fontSize: font.body, color: colors.textMuted },
  infoValue: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  emptyTxn: {
    padding: spacing.lg,
    color: colors.textMuted,
    textAlign: "center",
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  txnDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  txnIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  txnType: { fontSize: font.body, fontWeight: "600", color: colors.text },
  txnMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  txnQty: { fontSize: font.body, fontWeight: "800" },
  manageRow: { flexDirection: "row", gap: spacing.md },
});
