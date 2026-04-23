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
import { useStore } from "../store/useStore";
import { Group } from "../store/useStore";

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
          <Text style={styles.heading}>Add Expense</Text>

          {/* Amount */}
          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            placeholder="e.g. 5000"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
            autoFocus
          />

          {/* Paid By */}
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

          {/* Actions */}
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
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  memberChipActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  memberChipText: {
    fontSize: 14,
    color: "#333",
  },
  memberChipTextActive: {
    color: "#fff",
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
    marginTop: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#888",
    fontSize: 16,
  },
});
