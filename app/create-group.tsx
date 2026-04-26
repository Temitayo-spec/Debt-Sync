import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AppScreen from "../src/components/AppScreen";
import { useStore } from "../src/store/useStore";
import { palette, radii, shadows, typography } from "../src/theme";

export default function CreateGroup() {
  const [name, setName] = useState("");
  const createGroup = useStore((s) => s.createGroup);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createGroup(name.trim());
    router.back();
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Build a shared tab</Text>
          <Text style={styles.heading}>Create a new group</Text>
          <Text style={styles.subheading}>
            Give your group a name. You'll be added as the first member. Share
            the invite code with others so they can join.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Group name</Text>
          <TextInput
            placeholder="e.g. Lagos Trip"
            placeholderTextColor={palette.inkFaint}
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoFocus
          />
          <Text style={styles.hint}>
            Others will join using the invite code after the group is created.
          </Text>
        </View>

        <Pressable
          onPress={handleCreate}
          style={[
            styles.button,
            name.trim().length === 0 && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>Create Group</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 6,
  },
  container: {
    flex: 1,
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
    marginBottom: 20,
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
    marginBottom: 8,
    backgroundColor: palette.surfaceMuted,
  },
  hint: {
    fontSize: 12,
    fontFamily: typography.body,
    color: palette.inkFaint,
    lineHeight: 18,
  },
  button: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
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
  cancel: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelText: {
    color: palette.inkSoft,
    fontFamily: typography.body,
    fontSize: 16,
  },
});
