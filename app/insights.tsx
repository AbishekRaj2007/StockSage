import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Badge, BadgeTone, Card, EmptyState, SectionTitle } from "../components/ui";
import { useData } from "../lib/store";
import { colors, font, radius, spacing } from "../lib/theme";
import { compactCurrency, currency, percent } from "../lib/format";
import { MarginHealth, ProductInsight } from "../lib/insights";

const HEALTH: Record<
  MarginHealth,
  { tone: BadgeTone; label: string; color: string }
> = {
  loss: { tone: "danger", label: "Loss", color: colors.danger },
  thin: { tone: "warning", label: "Thin", color: colors.warning },
  healthy: { tone: "success", label: "Healthy", color: colors.success },
};

// Magnitude of a single value (margin %) → a status-colored bar. The color is a
// reserved status signal, always paired with the % text and a health label, so
// meaning never rests on color alone.
function MarginBar({ insight }: { insight: ProductInsight }) {
  const h = HEALTH[insight.marginHealth];
  const FULL = 0.4; // 40% margin fills the track
  const fill = Math.max(0.04, Math.min(1, insight.marginPct / FULL));
  return (
    <View style={styles.meterTrack}>
      <View
        style={[
          styles.meterFill,
          { width: `${fill * 100}%`, backgroundColor: h.color },
        ]}
      />
    </View>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: tone + "22" }]}>
        <Ionicons name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const { insights } = useData();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero: realized profit is the headline number */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>
          Profit earned · last {insights.windowDays} days
        </Text>
        <Text style={styles.heroValue}>
          {currency(insights.totalRealizedProfit)}
        </Text>
        <Text style={styles.heroSub}>
          on {currency(insights.totalRevenue)} revenue ·{" "}
          {percent(insights.overallMarginPct, 1)} margin
        </Text>
      </View>

      {/* KPI tiles */}
      <View style={styles.tileRow}>
        <Tile
          icon="lock-open"
          label="Profit in stock"
          value={compactCurrency(insights.potentialProfitInStock)}
          sub="if current stock sells"
          tone={colors.primary}
        />
        <Tile
          icon="snow"
          label="Dead stock"
          value={compactCurrency(insights.deadStockValue)}
          sub={`${insights.deadStockCount} product${
            insights.deadStockCount === 1 ? "" : "s"
          } idle`}
          tone={colors.info}
        />
      </View>

      {/* Top performers */}
      <View style={styles.section}>
        <SectionTitle>Top performers · {insights.windowDays}d</SectionTitle>
        {insights.topPerformers.length === 0 ? (
          <Card>
            <Text style={styles.muted}>No sales in this window yet.</Text>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {insights.topPerformers.map((i, idx, arr) => (
              <Pressable
                key={i.product.id}
                onPress={() => router.push(`/product/${i.product.id}`)}
                style={[styles.row, idx < arr.length - 1 && styles.rowDivider]}
              >
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {i.product.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {i.unitsSold} {i.product.unit} sold ·{" "}
                    {percent(i.marginPct)} margin
                  </Text>
                </View>
                <Text style={styles.profitValue}>
                  {currency(i.realizedProfit)}
                </Text>
              </Pressable>
            ))}
          </Card>
        )}
      </View>

      {/* Thin margins */}
      <View style={styles.section}>
        <SectionTitle>Watch your margins</SectionTitle>
        {insights.thinMargins.length === 0 ? (
          <Card>
            <View style={styles.goodRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.muted}>
                Every product clears a healthy margin.
              </Text>
            </View>
          </Card>
        ) : (
          insights.thinMargins.map((i) => {
            const h = HEALTH[i.marginHealth];
            return (
              <Card key={i.product.id} style={styles.marginCard}>
                <View style={styles.marginHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {i.product.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {currency(i.product.costPrice)} →{" "}
                      {currency(i.product.sellingPrice)} ·{" "}
                      {currency(i.unitMargin)}/{i.product.unit}
                    </Text>
                  </View>
                  <Badge tone={h.tone} label={h.label} />
                </View>
                <View style={styles.meterRow}>
                  <MarginBar insight={i} />
                  <Text style={[styles.meterPct, { color: h.color }]}>
                    {percent(i.marginPct, 1)}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Dead stock */}
      <View style={styles.section}>
        <SectionTitle>Dead stock · frozen cash</SectionTitle>
        {insights.deadStock.length === 0 ? (
          <Card>
            <View style={styles.goodRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.muted}>
                Everything has sold recently — no idle stock.
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {insights.deadStock.map((i, idx, arr) => (
              <Pressable
                key={i.product.id}
                onPress={() => router.push(`/product/${i.product.id}`)}
                style={[styles.row, idx < arr.length - 1 && styles.rowDivider]}
              >
                <View style={styles.snowIcon}>
                  <Ionicons name="snow-outline" size={16} color={colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {i.product.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {i.daysSinceLastSale == null
                      ? "Never sold"
                      : `No sale in ${i.daysSinceLastSale} days`}{" "}
                    · {i.product.quantity} {i.product.unit}
                  </Text>
                </View>
                <Text style={styles.frozenValue}>
                  {currency(i.product.stockValue)}
                </Text>
              </Pressable>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  heroLabel: { color: "#94A3B8", fontSize: font.small, fontWeight: "600" },
  heroValue: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 6,
  },
  heroSub: { color: "#CBD5E1", fontSize: font.small, marginTop: 4 },
  tileRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  tileValue: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  tileLabel: {
    fontSize: font.small,
    color: colors.text,
    fontWeight: "600",
    marginTop: 2,
  },
  tileSub: { fontSize: font.tiny, color: colors.textFaint, marginTop: 2 },
  section: { marginTop: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.body },
  goodRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rank: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: font.small, fontWeight: "800", color: colors.primary },
  rowName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  rowMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  profitValue: { fontSize: font.body, fontWeight: "800", color: colors.success },
  marginCard: { marginBottom: spacing.md, gap: spacing.md },
  marginHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meterRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meterTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "#EEF1F6",
    overflow: "hidden",
  },
  meterFill: { height: "100%", borderRadius: radius.pill },
  meterPct: { fontSize: font.small, fontWeight: "800", minWidth: 46, textAlign: "right" },
  snowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  frozenValue: { fontSize: font.body, fontWeight: "800", color: colors.info },
});
