import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useStore } from "../src/store/useStore";

export default function CreateGroup() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const createGroup = useStore((s) => s.createGroup);
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim() || !members.trim()) return;

    const memberList = members
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    if (memberList.length < 2) return;

    createGroup(name.trim(), memberList);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.heading}>New Group</Text>

      <Text style={styles.label}>Group Name</Text>
      <TextInput
        placeholder="e.g. Lagos Trip"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.label}>Members</Text>
      <TextInput
        placeholder="e.g. Tayo, Ada, John"
        value={members}
        onChangeText={setMembers}
        style={styles.input}
      />
      <Text style={styles.hint}>Separate names with commas</Text>

      <Pressable
        onPress={handleCreate}
        style={[
          styles.button,
          (!name.trim() || !members.trim()) && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>Create Group</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: "#aaa",
    marginTop: -10,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  cancel: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelText: {
    color: "#888",
    fontSize: 16,
  },
});
