import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { Group, useStore } from "../store/useStore";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  group: Group;
}

export default function AddExpenseModal({ open, setOpen, group }: Props) {
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(group.members[0]);
  const addExpense = useStore((s) => s.addExpense);

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    addExpense(group.id, {
      amount: parsed,
      paidBy,
      participants: group.members,
    });

    setAmount("");
    setPaidBy(group.members[0]);
    setOpen(false);
  };

  return (
    <Modal visible={open} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.heading}>Add Expense</Text>
          <Text style={styles.subheading}>
            Capture who paid and Debt Sync will split the cost evenly across
            everyone in this group.
          </Text>

          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            placeholder="e.g. 5000"
            placeholderTextColor={palette.inkFaint}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
            autoFocus
          />

          <Text style={styles.label}>Paid by</Text>
          <View style={styles.memberRow}>
            {group.members.map((member) => (
              <Pressable
                key={member}
                onPress={() => setPaidBy(member)}
                style={[
                  styles.memberChip,
                  paidBy === member && styles.memberChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.memberChipText,
                    paidBy === member && styles.memberChipTextActive,
                  ]}
                >
                  {member}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleAdd}
            style={[
              styles.button,
              (!amount.trim() || parseFloat(amount) <= 0) &&
                styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Add Expense</Text>
          </Pressable>

          <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(28, 25, 23, 0.26)",
  },
  sheet: {
    backgroundColor: palette.surface,
    padding: 24,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  handle: {
    width: 54,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.line,
    alignSelf: "center",
    marginBottom: 18,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 22,
    color: palette.ink,
  },
  subheading: {
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSoft,
    marginTop: 8,
    marginBottom: 24,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: palette.inkSoft,
    marginBottom: 10,
    letterSpacing: 1.5,
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
    marginBottom: 20,
    backgroundColor: palette.surfaceMuted,
  },
  memberRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  memberChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  memberChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  memberChipText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
  },
  memberChipTextActive: {
    color: palette.surface,
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
    marginTop: 12,
    alignItems: "center",
  },
  cancelText: {
    color: palette.inkSoft,
    fontFamily: typography.body,
    fontSize: 16,
  },
});
