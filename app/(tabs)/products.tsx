import { useMemo, useState } from "react";
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
import { Chip, EmptyState, Field } from "../../components/ui";
import { ProductCard } from "../../components/ProductCard";
import { useData } from "../../lib/store";
import { colors, font, radius, spacing } from "../../lib/theme";

const SORTS = ["Urgency", "Name", "Value"] as const;
type Sort = (typeof SORTS)[number];

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, categories } = useData();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("Urgency");

  const urgencyRank = { critical: 0, warning: 1, unknown: 2, ok: 3 };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q);
      const matchesCat = !category || p.category === category;
      return matchesQuery && matchesCat;
    });

    list = [...list].sort((a, b) => {
      if (sort === "Name") return a.name.localeCompare(b.name);
      if (sort === "Value") return b.stockValue - a.stockValue;
      return (
        urgencyRank[a.urgency] - urgencyRank[b.urgency] ||
        (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999)
      );
    });
    return list;
  }, [products, query, category, sort]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.count}>{products.length} items</Text>
      </View>

      <View style={styles.searchWrap}>
        <Field
          containerStyle={{ marginBottom: 0, flex: 1 }}
          placeholder="Search name, SKU or barcode"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Category filter */}
      <View>
        <FlatList
          horizontal
          data={["All", ...categories]}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <Chip
              label={item}
              active={item === "All" ? category === null : category === item}
              onPress={() => setCategory(item === "All" ? null : item)}
            />
          )}
        />
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        <Ionicons name="swap-vertical" size={15} color={colors.textMuted} />
        <Text style={styles.sortLabel}>Sort:</Text>
        {SORTS.map((s) => (
          <Pressable key={s} onPress={() => setSort(s)}>
            <Text style={[styles.sortItem, sort === s && styles.sortActive]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No products found"
            message="Try a different search or clear the filters."
          />
        }
      />

      <Pressable
        style={[styles.fab, { bottom: spacing.lg }]}
        onPress={() => router.push("/product/form")}
      >
        <Ionicons name="add" size={26} color={colors.white} />
        <Text style={styles.fabText}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  count: { fontSize: font.small, color: colors.textMuted },
  searchWrap: { paddingHorizontal: spacing.lg },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sortLabel: { fontSize: font.small, color: colors.textMuted },
  sortItem: { fontSize: font.small, color: colors.textMuted, fontWeight: "600" },
  sortActive: { color: colors.primary, fontWeight: "800" },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: colors.white, fontWeight: "800", fontSize: font.body },
});
