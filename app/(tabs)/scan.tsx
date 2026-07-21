import { useCallback, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState } from "../../components/ui";
import { useData } from "../../lib/store";
import { colors, font, radius, spacing } from "../../lib/theme";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, getByBarcode } = useData();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const lock = useRef(false);

  // Reset the scan lock every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      lock.current = false;
      return () => {
        lock.current = true;
      };
    }, [])
  );

  const handleCode = useCallback(
    (code: string) => {
      if (lock.current) return;
      lock.current = true;
      setScanned(true);

      const existing = getByBarcode(code);
      if (existing) {
        router.push(`/product/${existing.id}`);
      } else {
        // Not found → start Add Product with the barcode pre-filled.
        router.push(`/product/form?barcode=${encodeURIComponent(code)}`);
      }
    },
    [getByBarcode, router]
  );

  // Demo helper: simulate scanning the first product that has a barcode, so the
  // flow is testable without a physical barcode (e.g. in a simulator).
  const simulate = () => {
    const withCode = products.find((p) => p.barcode);
    handleCode(withCode?.barcode ?? "0000000000000");
  };

  // --- Permission states -------------------------------------------------

  if (Platform.OS === "web") {
    return (
      <ScanFallback insetTop={insets.top}>
        <EmptyState
          icon="laptop-outline"
          title="Camera scanning is mobile-only"
          message="Open StockSage in Expo Go on your phone to scan barcodes. You can still simulate a scan below."
          action={<Button label="Simulate a scan" icon="flash" onPress={simulate} />}
        />
      </ScanFallback>
    );
  }

  if (!permission) {
    return (
      <ScanFallback insetTop={insets.top}>
        <EmptyState
          icon="camera-outline"
          title="Preparing camera…"
          message="Checking camera permissions."
        />
      </ScanFallback>
    );
  }

  if (!permission.granted) {
    return (
      <ScanFallback insetTop={insets.top}>
        <EmptyState
          icon="lock-closed-outline"
          title="Camera permission needed"
          message="StockSage uses your camera to scan product barcodes. Nothing is recorded."
          action={
            <View style={{ gap: spacing.md, width: "100%" }}>
              {permission.canAskAgain ? (
                <Button
                  label="Allow camera access"
                  icon="camera"
                  onPress={requestPermission}
                />
              ) : (
                <Button
                  label="Open Settings"
                  icon="settings-outline"
                  onPress={() => Linking.openSettings()}
                />
              )}
              <Button
                label="Simulate a scan instead"
                variant="ghost"
                icon="flash"
                onPress={simulate}
              />
            </View>
          }
        />
      </ScanFallback>
    );
  }

  // --- Live camera -------------------------------------------------------

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                if (data) handleCode(String(data));
              }
        }
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "qr",
          ],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.topTitle}>Scan barcode</Text>
          <Text style={styles.topSub}>
            Point at a product barcode to look it up
          </Text>
        </View>

        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </View>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 80 }]}>
          {scanned ? (
            <Pressable
              style={styles.rescan}
              onPress={() => {
                setScanned(false);
                lock.current = false;
              }}
            >
              <Ionicons name="scan" size={18} color={colors.white} />
              <Text style={styles.rescanText}>Scan again</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.rescan} onPress={simulate}>
              <Ionicons name="flash" size={18} color={colors.white} />
              <Text style={styles.rescanText}>Simulate a scan</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = {
    position: "absolute" as const,
    width: 30,
    height: 30,
    borderColor: colors.white,
  };
  const map = {
    tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
    tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
    bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
    br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  };
  return <View style={[base, map[pos], { borderRadius: 4 }]} />;
}

function ScanFallback({
  children,
  insetTop,
}: {
  children: React.ReactNode;
  insetTop: number;
}) {
  return (
    <View style={[styles.fallback, { paddingTop: insetTop + spacing.xl }]}>
      <Text style={styles.fallbackTitle}>Scan</Text>
      <View style={styles.fallbackBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topTitle: { color: colors.white, fontSize: font.h2, fontWeight: "800" },
  topSub: { color: "#CBD5E1", fontSize: font.small, marginTop: 4 },
  frameWrap: { alignItems: "center", justifyContent: "center" },
  frame: {
    width: 250,
    height: 250,
    borderRadius: radius.lg,
  },
  bottomBar: { alignItems: "center" },
  rescan: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    height: 50,
    borderRadius: radius.pill,
  },
  rescanText: { color: colors.white, fontWeight: "800", fontSize: font.body },
  fallback: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  fallbackTitle: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  fallbackBody: { flex: 1, justifyContent: "center" },
});
