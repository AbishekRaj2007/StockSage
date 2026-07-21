import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { DataProvider } from "../lib/store";
import { colors } from "../lib/theme";

function SplashOverlay() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashBrand}>StockSage</Text>
      <ActivityIndicator color={colors.white} style={{ marginTop: 16 }} />
    </View>
  );
}

// Top-level navigation guard (Phase 2). Rather than imperatively redirecting in
// an effect — which races the root navigator's mount and throws "Attempted to
// navigate before mounting the Root Layout" — we declare the guards with
// <Stack.Protected>. Expo Router removes guarded-off screens from the navigation
// state and redirects to an available route *after* the navigator is ready, so
// there's no race and a signed-out user never renders an inventory screen.
function RootNavigator() {
  const { user, initializing } = useAuth();

  // While auth is resolving (a real backend would restore a session here), keep
  // the navigator unmounted behind the splash instead of flashing a screen.
  if (initializing) {
    return <SplashOverlay />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: "700", color: colors.text },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      {/* Authenticated area: tabs plus the detail/modal screens reached from them. */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: true, title: "Product" }}
        />
        <Stack.Screen
          name="product/form"
          options={{
            headerShown: true,
            presentation: "modal",
            title: "Product",
          }}
        />
        <Stack.Screen
          name="transaction/new"
          options={{
            headerShown: true,
            presentation: "modal",
            title: "Record Stock",
          }}
        />
      </Stack.Protected>

      {/* Sign-in / sign-up: the only reachable area while signed out. */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  splashBrand: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
