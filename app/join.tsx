import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AppScreen from "../src/components/AppScreen";
import { useStore } from "../src/store/useStore";
import { palette, radii, shadows, typography } from "../src/theme";

export default function JoinGroup() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const joinGroup = useStore((s) => s.joinGroup);
  const router = useRouter();

  const handleJoin = async () => {
    if (code.trim().length < 6) return;
    setIsLoading(true);
    const { error } = await joinGroup(code);
    setIsLoading(false);

    if (error) {
      Alert.alert("Couldn't join", error);
      return;
    }

    router.back();
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Join a group</Text>
        <Text style={styles.heading}>Enter your invite code</Text>
        <Text style={styles.subheading}>
          Ask the group creator to share their 6-character code with you.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Invite Code</Text>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          onChangeText={setCode}
          placeholder="e.g. XK92PL"
          placeholderTextColor={palette.inkFaint}
          style={styles.codeInput}
          value={code}
        />

        <Pressable
          disabled={isLoading || code.trim().length < 6}
          onPress={handleJoin}
          style={[
            styles.button,
            (isLoading || code.trim().length < 6) && styles.buttonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={palette.surface} />
          ) : (
            <Text style={styles.buttonText}>Join Group</Text>
          )}
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
  },
  back: {
    alignSelf: "flex-start",
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 20,
  },
  backText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.ink,
  },
  hero: {
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: typography.bodyMedium,
    color: palette.accent,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 36,
    lineHeight: 40,
    color: palette.ink,
    marginBottom: 10,
  },
  subheading: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 23,
    color: palette.inkSoft,
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
  codeInput: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    padding: 14,
    fontSize: 28,
    fontFamily: typography.display,
    color: palette.ink,
    marginBottom: 20,
    backgroundColor: palette.surfaceMuted,
    textAlign: "center",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    ...shadows.card,
  },
  buttonDisabled: {
    backgroundColor: palette.inkFaint,
  },
  buttonText: {
    color: palette.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 16,
  },
});
