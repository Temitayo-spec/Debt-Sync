import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AppScreen from "./AppScreen";
import { supabase } from "../lib/supabase";
import { palette, radii, shadows, typography } from "../theme";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const disabled =
    isLoading || email.trim().length === 0 || password.trim().length < 6;

  const isSignUp = mode === "signup";

  async function handleSubmit() {
    setIsLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      setIsLoading(false);

      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }

      if (!data.session) {
        Alert.alert(
          "Check your email",
          "We sent you a confirmation link. Verify your email then sign in.",
        );
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setIsLoading(false);

      if (error) {
        Alert.alert("Sign in failed", error.message);
      }
    }
  }

  function switchMode() {
    setMode(isSignUp ? "signin" : "signup");
    setEmail("");
    setPassword("");
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Shared finance, simplified</Text>
        <Text style={styles.heading}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={styles.subheading}>
          {isSignUp
            ? "Sign up to start tracking shared expenses across your groups."
            : "Sign in to pick up where you left off."}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={palette.inkFaint}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor={palette.inkFaint}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        <Pressable
          disabled={disabled}
          onPress={handleSubmit}
          style={[styles.primaryButton, disabled && styles.buttonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color={palette.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isSignUp ? "Create Account" : "Sign In"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Switch mode */}
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
        </Text>
        <Pressable onPress={switchMode}>
          <Text style={styles.switchLink}>
            {isSignUp ? "Sign In" : "Create one"}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 24,
  },
  heroCard: {
    backgroundColor: palette.ink,
    borderRadius: radii.lg,
    padding: 24,
    marginBottom: 18,
    ...shadows.card,
  },
  eyebrow: {
    fontFamily: typography.bodyMedium,
    color: palette.accentSoft,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 34,
    lineHeight: 38,
    color: palette.surface,
    marginBottom: 10,
  },
  subheading: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 23,
    color: "#D8D1C7",
  },
  formCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 20,
    ...shadows.card,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    marginBottom: 10,
    color: palette.inkSoft,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    padding: 14,
    fontSize: 16,
    fontFamily: typography.body,
    color: palette.ink,
    marginBottom: 16,
    backgroundColor: palette.surfaceMuted,
  },
  primaryButton: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    marginTop: 4,
    ...shadows.card,
  },
  primaryButtonText: {
    color: palette.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: palette.inkFaint,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  switchText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.inkSoft,
  },
  switchLink: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.accent,
  },
});
