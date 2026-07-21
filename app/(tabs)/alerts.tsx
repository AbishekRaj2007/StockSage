import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, EmptyState } from "../../components/ui";
import { AlertType } from "../../lib/types";
import { useData } from "../../lib/store";
import { colors, font, radius, spacing } from "../../lib/theme";
import { relativeTime } from "../../lib/format";

const META: Record<
  AlertType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    tone: "danger" | "warning" | "info";
    label: string;
  }
> = {
  "predicted-stockout": {
    icon: "trending-down",
    tone: "danger",
    label: "Predicted stock-out",
  },
  "low-stock": { icon: "alert-circle", tone: "warning", label: "Low stock" },
  anomaly: { icon: "pulse", tone: "info", label: "Anomaly" },
};

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { alerts, resolveAlert } = useData();

  const active = alerts.filter((a) => !a.resolved);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        {active.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{active.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const meta = META[item.type];
          const toneColor =
            meta.tone === "danger"
              ? colors.danger
              : meta.tone === "warning"
              ? colors.warning
              : colors.info;
          return (
            <Pressable
              onPress={() => router.push(`/product/${item.productId}`)}
              style={[styles.card, item.resolved && styles.cardResolved]}
            >
              <View
                style={[styles.icon, { backgroundColor: toneColor + "1A" }]}
              >
                <Ionicons name={meta.icon} size={20} color={toneColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHead}>
                  <Badge tone={meta.tone} label={meta.label} />
                  <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
                </View>
                <Text
                  style={[styles.msg, item.resolved && styles.msgResolved]}
                >
                  {item.message}
                </Text>

                {!item.resolved ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => resolveAlert(item.id)}
                    style={styles.resolveBtn}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={styles.resolveText}>Mark resolved</Text>
                  </Pressable>
                ) : (
                  <View style={styles.resolvedRow}>
                    <Ionicons
                      name="checkmark-done"
                      size={15}
                      color={colors.textFaint}
                    />
                    <Text style={styles.resolvedLabel}>Resolved</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No alerts"
            message="You're all caught up. Alerts appear here when a product is predicted to run out, drops below its reorder level, or shows an unusual stock-out."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  countPill: {
    minWidth: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: { color: colors.white, fontWeight: "800", fontSize: font.small },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardResolved: { opacity: 0.6 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  time: { fontSize: font.tiny, color: colors.textFaint },
  msg: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  msgResolved: { textDecorationLine: "line-through", color: colors.textMuted },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  resolveText: { fontSize: font.small, color: colors.success, fontWeight: "700" },
  resolvedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  resolvedLabel: { fontSize: font.small, color: colors.textFaint },
});
