import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import { Button, Card, Field } from "../../components/ui";
import { TransactionType } from "../../lib/types";
import { useData } from "../../lib/store";
import { colors, font, radius, spacing } from "../../lib/theme";

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId?: string;
    type?: string;
  }>();
  const { products, getProduct, recordTransaction } = useData();

  const [productId, setProductId] = useState<string | undefined>(
    params.productId
  );
  const [type, setType] = useState<TransactionType>(
    params.type === "stock-out" ? "stock-out" : "stock-in"
  );
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const product = getProduct(productId ?? "");
  const parsedQty = Number(qty);
  const validQty = Number.isInteger(parsedQty) && parsedQty > 0;

  const projected = useMemo(() => {
    if (!product || !validQty) return null;
    return type === "stock-in"
      ? product.quantity + parsedQty
      : product.quantity - parsedQty;
  }, [product, validQty, parsedQty, type]);

  const onSubmit = () => {
    setError(null);
    if (!productId) {
      setError("Select a product first.");
      return;
    }
    if (!validQty) {
      setError("Enter a whole number greater than 0.");
      return;
    }
    try {
      recordTransaction({ productId, type, quantity: parsedQty, note });
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Could not record transaction.");
    }
  };

  // Product picker when no product is preselected.
  if (!product) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: "Record Stock" }} />
        <Text style={styles.pickHint}>Select a product</Text>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {products.map((p) => (
            <Pressable key={p.id} onPress={() => setProductId(p.id)}>
              <Card style={styles.pickRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickName}>{p.name}</Text>
                  <Text style={styles.pickMeta}>
                    {p.quantity} {p.unit} · {p.sku}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textFaint}
                />
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const isIn = type === "stock-in";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Record Stock" }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product summary */}
        <Card style={styles.summary}>
          <Text style={styles.summaryName}>{product.name}</Text>
          <Text style={styles.summaryMeta}>
            Currently {product.quantity} {product.unit} in stock
          </Text>
        </Card>

        {/* Type toggle */}
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, isIn && styles.toggleActiveIn]}
            onPress={() => setType("stock-in")}
          >
            <Ionicons
              name="arrow-down"
              size={18}
              color={isIn ? colors.white : colors.success}
            />
            <Text style={[styles.toggleText, isIn && styles.toggleTextActive]}>
              Stock In
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, !isIn && styles.toggleActiveOut]}
            onPress={() => setType("stock-out")}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={!isIn ? colors.white : colors.danger}
            />
            <Text style={[styles.toggleText, !isIn && styles.toggleTextActive]}>
              Stock Out
            </Text>
          </Pressable>
        </View>

        <Field
          label="Quantity"
          placeholder="0"
          keyboardType="number-pad"
          value={qty}
          onChangeText={setQty}
          error={error}
          autoFocus
        />

        {projected != null && (
          <View
            style={[
              styles.preview,
              projected < 0 && { backgroundColor: colors.dangerSoft },
            ]}
          >
            <Text style={styles.previewLabel}>New quantity</Text>
            <Text
              style={[
                styles.previewValue,
                { color: projected < 0 ? colors.danger : colors.text },
              ]}
            >
              {product.quantity} {isIn ? "+" : "−"} {parsedQty} ={" "}
              {projected} {product.unit}
            </Text>
          </View>
        )}

        <Field
          label="Note (optional)"
          placeholder={isIn ? "e.g. Supplier delivery" : "e.g. Counter sale"}
          value={note}
          onChangeText={setNote}
        />

        <Button
          label={isIn ? "Record Stock In" : "Record Stock Out"}
          icon="checkmark"
          onPress={onSubmit}
          variant={isIn ? "primary" : "primary"}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pickHint: {
    fontSize: font.small,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  pickName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  pickMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  summary: { marginBottom: spacing.lg },
  summaryName: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  summaryMeta: { fontSize: font.body, color: colors.textMuted, marginTop: 4 },
  toggle: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  toggleActiveIn: { backgroundColor: colors.success, borderColor: colors.success },
  toggleActiveOut: { backgroundColor: colors.danger, borderColor: colors.danger },
  toggleText: { fontSize: font.body, fontWeight: "700", color: colors.textMuted },
  toggleTextActive: { color: colors.white },
  preview: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  previewLabel: { fontSize: font.small, color: colors.textMuted },
  previewValue: { fontSize: font.h3, fontWeight: "800", marginTop: 4 },
});
