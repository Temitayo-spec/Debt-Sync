import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import AuthScreen from "../src/components/AuthScreen";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
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

  return (
    <>
      <StatusBar style="dark" backgroundColor={palette.background} />
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
