import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import { Button, Field } from "../../components/ui";
import { ProductInput, useData } from "../../lib/store";
import { colors, font, spacing } from "../../lib/theme";

type FormState = {
  name: string;
  sku: string;
  category: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  reorderThreshold: string;
  barcode: string;
};

const EMPTY: FormState = {
  name: "",
  sku: "",
  category: "",
  quantity: "0",
  unit: "pcs",
  costPrice: "",
  sellingPrice: "",
  reorderThreshold: "",
  barcode: "",
};

export default function ProductFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; barcode?: string }>();
  const { getProduct, addProduct, updateProduct } = useData();

  const editing = getProduct(params.id ?? "");
  const isEdit = !!editing;

  const [form, setForm] = useState<FormState>(() => {
    if (editing) {
      return {
        name: editing.name,
        sku: editing.sku,
        category: editing.category,
        quantity: String(editing.quantity),
        unit: editing.unit,
        costPrice: String(editing.costPrice),
        sellingPrice: String(editing.sellingPrice),
        reorderThreshold: String(editing.reorderThreshold),
        barcode: editing.barcode ?? "",
      };
    }
    return { ...EMPTY, barcode: params.barcode ?? "" };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const validate = (): ProductInput | null => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.sku.trim()) e.sku = "SKU is required.";
    if (!form.category.trim()) e.category = "Category is required.";
    if (!form.unit.trim()) e.unit = "Unit is required.";

    const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
    const qty = num(form.quantity);
    const cost = num(form.costPrice);
    const sell = num(form.sellingPrice);
    const reorder = num(form.reorderThreshold);

    if (!isEdit && (Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)))
      e.quantity = "Enter a whole number ≥ 0.";
    if (Number.isNaN(cost) || cost < 0) e.costPrice = "Enter a number ≥ 0.";
    if (Number.isNaN(sell) || sell < 0) e.sellingPrice = "Enter a number ≥ 0.";
    if (Number.isNaN(reorder) || reorder < 0)
      e.reorderThreshold = "Enter a number ≥ 0.";

    setErrors(e);
    if (Object.keys(e).length > 0) return null;

    return {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      quantity: isEdit ? editing!.quantity : qty,
      unit: form.unit.trim(),
      costPrice: cost,
      sellingPrice: sell,
      reorderThreshold: reorder,
      barcode: form.barcode.trim() ? form.barcode.trim() : null,
    };
  };

  const onSave = () => {
    const input = validate();
    if (!input) return;
    if (isEdit) {
      updateProduct(editing!.id, input);
    } else {
      addProduct(input);
    }
    // Dismiss the modal; the list/detail updates live from the store.
    router.back();
  };

  const title = isEdit ? "Edit Product" : "Add Product";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {params.barcode ? (
          <View style={styles.banner}>
            <Ionicons name="barcode-outline" size={18} color={colors.primary} />
            <Text style={styles.bannerText}>
              Barcode {params.barcode} pre-filled from scan.
            </Text>
          </View>
        ) : null}

        <Field
          label="Product name *"
          placeholder="e.g. Sunrise Basmati Rice 5kg"
          value={form.name}
          onChangeText={set("name")}
          error={errors.name}
        />

        <View style={styles.row}>
          <Field
            label="SKU *"
            placeholder="GRC-RICE-5"
            autoCapitalize="characters"
            value={form.sku}
            onChangeText={set("sku")}
            error={errors.sku}
            containerStyle={styles.flex}
          />
          <Field
            label="Category *"
            placeholder="Groceries"
            value={form.category}
            onChangeText={set("category")}
            error={errors.category}
            containerStyle={styles.flex}
          />
        </View>

        <View style={styles.row}>
          <Field
            label={isEdit ? "Quantity (locked)" : "Opening quantity *"}
            placeholder="0"
            keyboardType="number-pad"
            value={form.quantity}
            onChangeText={set("quantity")}
            error={errors.quantity}
            editable={!isEdit}
            hint={isEdit ? "Adjust via Stock In / Out" : undefined}
            containerStyle={styles.flex}
          />
          <Field
            label="Unit *"
            placeholder="pcs / kg / packs"
            value={form.unit}
            onChangeText={set("unit")}
            error={errors.unit}
            containerStyle={styles.flex}
          />
        </View>

        <View style={styles.row}>
          <Field
            label="Cost price *"
            placeholder="0"
            keyboardType="decimal-pad"
            value={form.costPrice}
            onChangeText={set("costPrice")}
            error={errors.costPrice}
            containerStyle={styles.flex}
          />
          <Field
            label="Selling price *"
            placeholder="0"
            keyboardType="decimal-pad"
            value={form.sellingPrice}
            onChangeText={set("sellingPrice")}
            error={errors.sellingPrice}
            containerStyle={styles.flex}
          />
        </View>

        <Field
          label="Reorder threshold *"
          placeholder="Fallback low-stock level"
          keyboardType="number-pad"
          value={form.reorderThreshold}
          onChangeText={set("reorderThreshold")}
          error={errors.reorderThreshold}
          hint="Used until enough sales history exists to forecast."
        />

        <Field
          label="Barcode"
          placeholder="Optional — or fill via Scan tab"
          keyboardType="number-pad"
          value={form.barcode}
          onChangeText={set("barcode")}
        />

        <View style={styles.actions}>
          <Button
            label="Cancel"
            variant="ghost"
            style={styles.flex}
            onPress={() => router.back()}
          />
          <Button
            label={isEdit ? "Save changes" : "Add product"}
            icon="checkmark"
            style={styles.flex}
            onPress={onSave}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { color: colors.primary, fontWeight: "600", fontSize: font.small },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
});
