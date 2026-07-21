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

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUp(name, email, password);
    } catch (e: any) {
      setError(e.message ?? "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.back} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
        </Link>
        <Text style={styles.brand}>Create your account</Text>
        <Text style={styles.tagline}>
          Start tracking inventory in minutes.
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
            <Field
              label="Full name"
              placeholder="Rohith Kumar"
              value={name}
              onChangeText={setName}
            />
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
              placeholder="At least 6 characters"
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
              label="Create Account"
              onPress={onSubmit}
              loading={loading}
              icon="person-add-outline"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.link}>Sign in</Text>
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
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  back: { marginBottom: spacing.lg },
  brand: { fontSize: font.h1, fontWeight: "800", color: colors.white },
  tagline: { marginTop: 6, fontSize: font.body, color: "#CBD5E1" },
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: { fontSize: font.body, color: colors.textMuted },
  link: { fontSize: font.body, color: colors.primary, fontWeight: "700" },
});
