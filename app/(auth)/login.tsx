import { useState } from "react";
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
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { colors, font, radius, spacing } from "../../lib/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("rohith@stocksage.app");
  const [password, setPassword] = useState("demo123");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e.message ?? "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Ionicons name="cube" size={26} color={colors.white} />
          </View>
          <Text style={styles.brand}>StockSage</Text>
        </View>
        <Text style={styles.tagline}>
          AI-powered inventory that reasons about your stock — not just lists
          it.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your warehouse</Text>

            <Field
              label="Email"
              placeholder="you@business.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              placeholder="••••••••"
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
              error={error}
              right={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textFaint}
                  />
                </Pressable>
              }
            />

            <Button
              label="Sign In"
              onPress={onSubmit}
              loading={loading}
              icon="log-in-outline"
            />

            <View style={styles.demoNote}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.demoText}>
                Demo build — any valid email + 6-char password works.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to StockSage? </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  flex: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: spacing.lg,
    fontSize: font.body,
    lineHeight: 22,
    color: "#CBD5E1",
    maxWidth: 320,
  },
  formScroll: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  subtitle: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  demoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.lg,
  },
  demoText: { fontSize: font.small, color: colors.textMuted, flex: 1 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: { fontSize: font.body, color: colors.textMuted },
  link: { fontSize: font.body, color: colors.primary, fontWeight: "700" },
});
