import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import AuthScreen from "../src/components/AuthScreen";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { useStore } from "../src/store/useStore";
import { palette } from "../src/theme";

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isLoading, session } = useAuth();
  const setOnline = useStore((s) => s.setOnline);
  const processPendingActions = useStore((s) => s.processPendingActions);
  const isOnline = useStore((s) => s.isOnline);
  const pendingCount = useStore((s) => s.pendingActions.length);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      setOnline(online);
      if (online) processPendingActions();
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor={palette.background} />
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {pendingCount > 0
              ? `Offline — ${pendingCount} action${pendingCount !== 1 ? "s" : ""} queued`
              : "You're offline"}
          </Text>
        </View>
      )}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={styles.loadingText}>Restoring your workspace...</Text>
        </View>
      ) : session ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.background },
          }}
        />
      ) : (
        <AuthScreen />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: palette.negative,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  offlineText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "System",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
    gap: 14,
  },
  loadingText: {
    color: palette.inkSoft,
    fontSize: 15,
  },
});
