import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, SectionTitle } from "../../components/ui";
import { UrgencyBadge } from "../../components/UrgencyBadge";
import { useAuth } from "../../lib/auth";
import { useData } from "../../lib/store";
import { colors, font, radius, spacing } from "../../lib/theme";
import { compactCurrency, relativeTime } from "../../lib/format";

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tone + "22" }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { products, transactions, stats, restockPlan } = useData();

  const attention = useMemo(
    () =>
      [...products]
        .filter((p) => p.urgency === "critical" || p.urgency === "warning")
        .sort(
          (a, b) => (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999)
        )
        .slice(0, 4),
    [products]
  );

  const recent = useMemo(() => transactions.slice(0, 6), [transactions]);
  const productName = (id: string) =>
    products.find((p) => p.id === id)?.name ?? "Unknown product";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>
            Hi {user?.name?.split(" ")[0] ?? "there"} 👋
          </Text>
          <Text style={styles.subHello}>Here's your inventory at a glance</Text>
        </View>
        <Pressable style={styles.avatar} onPress={signOut} hitSlop={8}>
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Hero value card */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroLabel}>Total stock value (at cost)</Text>
          <Text style={styles.heroValue}>
            {compactCurrency(stats.totalStockValue)}
          </Text>
          <Text style={styles.heroSub}>
            Potential revenue {compactCurrency(stats.potentialRevenue)}
          </Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="trending-up" size={26} color={colors.white} />
        </View>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <StatCard
          icon="cube"
          label="Products"
          value={String(stats.totalProducts)}
          tone={colors.primary}
        />
        <StatCard
          icon="alert-circle"
          label="Below reorder"
          value={String(stats.lowStockCount)}
          tone={colors.warning}
        />
        <StatCard
          icon="time"
          label="Critical (≤3d)"
          value={String(stats.criticalCount)}
          tone={colors.danger}
        />
      </View>

      {/* Restock Copilot — the forecast turned into an action queue */}
      <Pressable style={styles.section} onPress={() => router.push("/restock")}>
        <View
          style={[
            styles.cta,
            restockPlan.totalItems === 0 && styles.ctaCalm,
          ]}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="cart" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Restock Copilot</Text>
            <Text style={styles.ctaSub}>
              {restockPlan.totalItems === 0
                ? "You're all stocked up — nothing to reorder"
                : `${restockPlan.totalItems} item${
                    restockPlan.totalItems === 1 ? "" : "s"
                  } to reorder · est. ${compactCurrency(restockPlan.totalCost)}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </View>
      </Pressable>

      {/* Needs attention (forecast-driven) */}
      <View style={styles.section}>
        <SectionTitle
          action={
            <Pressable onPress={() => router.push("/(tabs)/products")}>
              <Text style={styles.link}>See all</Text>
            </Pressable>
          }
        >
          Needs attention
        </SectionTitle>

        {attention.length === 0 ? (
          <Card>
            <View style={styles.allGood}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.success}
              />
              <Text style={styles.allGoodText}>
                Everything's healthy — no products forecast to run out soon.
              </Text>
            </View>
          </Card>
        ) : (
          attention.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/product/${p.id}`)}
            >
              <Card style={styles.attnCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attnName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.attnMeta}>
                    {p.quantity} {p.unit} in stock ·{" "}
                    {p.forecast && p.forecast.avgDailyConsumption > 0
                      ? `${p.forecast.avgDailyConsumption.toFixed(1)} ${
                          p.unit
                        }/day`
                      : "no recent sales"}
                  </Text>
                </View>
                <UrgencyBadge product={p} />
              </Card>
            </Pressable>
          ))
        )}
      </View>

      {/* Recent activity */}
      <View style={styles.section}>
        <SectionTitle>Recent activity</SectionTitle>
        <Card style={{ padding: 0 }}>
          {recent.length === 0 ? (
            <Text style={styles.emptyFeed}>No transactions yet.</Text>
          ) : (
            recent.map((t, i) => {
              const isIn = t.type === "stock-in";
              return (
                <View
                  key={t.id}
                  style={[
                    styles.feedRow,
                    i < recent.length - 1 && styles.feedDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.feedIcon,
                      {
                        backgroundColor: isIn
                          ? colors.successSoft
                          : colors.dangerSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isIn ? "arrow-down" : "arrow-up"}
                      size={16}
                      color={isIn ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedName} numberOfLines={1}>
                      {productName(t.productId)}
                    </Text>
                    <Text style={styles.feedMeta}>
                      {isIn ? "Stock in" : "Stock out"} ·{" "}
                      {relativeTime(t.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.feedQty,
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  hello: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  subHello: { fontSize: font.body, color: colors.textMuted, marginTop: 2 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: { color: "#94A3B8", fontSize: font.small, fontWeight: "600" },
  heroValue: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 6,
  },
  heroSub: { color: "#CBD5E1", fontSize: font.small, marginTop: 4 },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statGrid: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  ctaCalm: { backgroundColor: colors.success },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: { color: colors.white, fontSize: font.h3, fontWeight: "800" },
  ctaSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: font.small,
    marginTop: 2,
  },
  link: { color: colors.primary, fontWeight: "700", fontSize: font.small },
  allGood: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  allGoodText: { flex: 1, color: colors.textMuted, fontSize: font.body },
  attnCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  attnName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  attnMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 3 },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  feedDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  feedIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  feedName: { fontSize: font.body, fontWeight: "600", color: colors.text },
  feedMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  feedQty: { fontSize: font.body, fontWeight: "800" },
  emptyFeed: {
    padding: spacing.lg,
    color: colors.textMuted,
    textAlign: "center",
  },
});
