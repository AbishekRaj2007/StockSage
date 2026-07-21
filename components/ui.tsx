// Reusable presentational building blocks used across every screen.

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, shadow, spacing } from "../lib/theme";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const palette: Record<
    ButtonVariant,
    { bg: string; fg: string; border?: string }
  > = {
    primary: { bg: colors.primary, fg: colors.white },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
    ghost: { bg: "transparent", fg: colors.text, border: colors.border },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const p = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? "transparent",
          borderWidth: p.border ? 1 : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon && <Ionicons name={icon} size={18} color={p.fg} />}
          <Text style={[styles.btnLabel, { color: p.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export function Badge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: "#F1F5F9", fg: colors.textMuted },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={c.fg} />}
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Field({
  label,
  error,
  hint,
  right,
  containerStyle,
  ...inputProps
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps) {
  return (
    <View style={[styles.field, containerStyle]}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          error ? { borderColor: colors.danger } : null,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          {...inputProps}
        />
        {right}
      </View>
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "cube-outline",
  title,
  message,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.textFaint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMsg}>{message}</Text>}
      {action && <View style={{ marginTop: spacing.md }}>{action}</View>}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: font.h3,
    fontWeight: "700",
    color: colors.text,
  },
  btn: {
    height: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  btnLabel: {
    fontSize: font.body,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: font.tiny,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: font.small,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: font.body,
    color: colors.text,
  },
  fieldError: {
    marginTop: 5,
    fontSize: font.small,
    color: colors.danger,
  },
  fieldHint: {
    marginTop: 5,
    fontSize: font.small,
    color: colors.textFaint,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: font.h3,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyMsg: {
    marginTop: 6,
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: font.small,
    fontWeight: "600",
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
});
