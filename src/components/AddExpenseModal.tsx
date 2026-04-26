import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { Group, useStore } from "../store/useStore";
import { CATEGORIES, SplitMode } from "../lib/settlement";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  group: Group;
}

const SPLIT_MODES: { mode: SplitMode; label: string; hint: string }[] = [
  { mode: "even", label: "Even", hint: "Split equally across everyone" },
  { mode: "exact", label: "Exact ₦", hint: "Enter each person's exact amount" },
  { mode: "percent", label: "%", hint: "Enter each person's percentage" },
  { mode: "shares", label: "Shares", hint: "Assign proportional shares" },
];

function initSplits(mode: SplitMode, members: string[], totalStr: string): Record<string, string> {
  if (mode === "even") return {};
  const total = parseFloat(totalStr) || 0;
  if (mode === "exact") {
    const share = total > 0 ? Math.floor(total / members.length).toString() : "";
    return Object.fromEntries(members.map((m) => [m, share]));
  }
  if (mode === "percent") {
    const share = Math.floor(100 / members.length).toString();
    return Object.fromEntries(members.map((m) => [m, share]));
  }
  // shares
  return Object.fromEntries(members.map((m) => [m, "1"]));
}

export default function AddExpenseModal({ open, setOpen, group }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(group.members[0]);
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [splits, setSplits] = useState<Record<string, string>>({});
  const addExpense = useStore((s) => s.addExpense);

  const parsedAmount = parseFloat(amount) || 0;

  const handleModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    setSplits(initSplits(mode, group.members, amount));
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (splitMode === "exact") {
      const total = parseFloat(val) || 0;
      const share = total > 0 ? Math.floor(total / group.members.length).toString() : "";
      setSplits(Object.fromEntries(group.members.map((m) => [m, share])));
    }
  };

  const splitTotal =
    splitMode !== "even"
      ? Object.values(splits).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : 0;

  const splitValid = (() => {
    if (splitMode === "even") return true;
    if (splitMode === "exact") return Math.abs(splitTotal - parsedAmount) < 1;
    if (splitMode === "percent") return Math.abs(splitTotal - 100) < 1;
    if (splitMode === "shares") return Object.values(splits).every((v) => parseFloat(v) > 0);
    return false;
  })();

  const canSubmit = title.trim().length > 0 && parsedAmount > 0 && splitValid;

  const getSplitHint = () => {
    if (splitMode === "exact")
      return `Total assigned: ₦${splitTotal.toLocaleString()} / ₦${parsedAmount.toLocaleString()}`;
    if (splitMode === "percent") return `Total: ${splitTotal.toFixed(0)}%`;
    if (splitMode === "shares") {
      const totalShares = splitTotal;
      return group.members
        .map((m) => {
          const sh = parseFloat(splits[m]) || 0;
          const eff = totalShares > 0 ? Math.round((parsedAmount * sh) / totalShares) : 0;
          return `${m}: ₦${eff.toLocaleString()}`;
        })
        .join("  ·  ");
    }
    return "";
  };

  const handleAdd = () => {
    if (!canSubmit) return;

    const parsedSplits: Record<string, number> =
      splitMode !== "even"
        ? Object.fromEntries(
            Object.entries(splits).map(([k, v]) => [k, parseFloat(v) || 0]),
          )
        : {};

    addExpense(group.id, {
      title: title.trim(),
      category,
      amount: parsedAmount,
      paidBy,
      participants: group.members,
      splitMode,
      splits: parsedSplits,
    });

    // reset
    setTitle("");
    setCategory("Food");
    setAmount("");
    setPaidBy(group.members[0]);
    setSplitMode("even");
    setSplits({});
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

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Add Expense</Text>

            {/* Title */}
            <Text style={styles.label}>Title</Text>
            <TextInput
              placeholder="e.g. Dinner at Yellow Chilli"
              placeholderTextColor={palette.inkFaint}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              autoFocus
            />

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.label}
                  onPress={() => setCategory(cat.label)}
                  style={[
                    styles.categoryChip,
                    category === cat.label && styles.categoryChipActive,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      category === cat.label && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Amount */}
            <Text style={styles.label}>Amount (₦)</Text>
            <TextInput
              placeholder="e.g. 5000"
              placeholderTextColor={palette.inkFaint}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              style={styles.input}
            />

            {/* Paid by */}
            <Text style={styles.label}>Paid by</Text>
            <View style={styles.chipRow}>
              {group.members.map((member) => (
                <Pressable
                  key={member}
                  onPress={() => setPaidBy(member)}
                  style={[styles.chip, paidBy === member && styles.chipActive]}
                >
                  <Text style={[styles.chipText, paidBy === member && styles.chipTextActive]}>
                    {member}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Split mode */}
            <Text style={styles.label}>Split</Text>
            <View style={styles.splitModeRow}>
              {SPLIT_MODES.map(({ mode, label }) => (
                <Pressable
                  key={mode}
                  onPress={() => handleModeChange(mode)}
                  style={[styles.splitModeChip, splitMode === mode && styles.splitModeChipActive]}
                >
                  <Text
                    style={[
                      styles.splitModeText,
                      splitMode === mode && styles.splitModeTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.splitHint}>
              {SPLIT_MODES.find((m) => m.mode === splitMode)?.hint}
            </Text>

            {/* Per-person inputs for non-even modes */}
            {splitMode !== "even" && (
              <View style={styles.perPersonContainer}>
                {splitMode !== "even" && parsedAmount > 0 && (
                  <Text style={[styles.splitTotal, !splitValid && styles.splitTotalWarning]}>
                    {getSplitHint()}
                  </Text>
                )}
                {group.members.map((member) => (
                  <View key={member} style={styles.perPersonRow}>
                    <Text style={styles.perPersonName}>{member}</Text>
                    <View style={styles.perPersonInputWrap}>
                      {splitMode !== "shares" && (
                        <Text style={styles.perPersonPrefix}>
                          {splitMode === "percent" ? "%" : "₦"}
                        </Text>
                      )}
                      <TextInput
                        keyboardType="numeric"
                        value={splits[member] ?? ""}
                        onChangeText={(val) =>
                          setSplits((prev) => ({ ...prev, [member]: val }))
                        }
                        style={styles.perPersonInput}
                        placeholder="0"
                        placeholderTextColor={palette.inkFaint}
                      />
                      {splitMode === "shares" && (
                        <Text style={styles.perPersonSuffix}>shares</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={handleAdd}
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>Add Expense</Text>
            </Pressable>

            <Pressable onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <View style={{ height: 16 }} />
          </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: "92%",
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
    marginBottom: 24,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
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
  categoryScroll: {
    marginBottom: 20,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 4,
  },
  categoryChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    fontFamily: typography.body,
    fontSize: 11,
    color: palette.inkSoft,
  },
  categoryLabelActive: {
    color: palette.accentSoft,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  chipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  chipText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
  },
  chipTextActive: {
    color: palette.surface,
  },
  splitModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  splitModeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  splitModeChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  splitModeText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
  splitModeTextActive: {
    color: palette.surface,
  },
  splitHint: {
    fontFamily: typography.body,
    fontSize: 12,
    color: palette.inkFaint,
    marginBottom: 16,
  },
  perPersonContainer: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.line,
  },
  splitTotal: {
    fontFamily: typography.body,
    fontSize: 12,
    color: palette.inkSoft,
    marginBottom: 4,
  },
  splitTotalWarning: {
    color: palette.negative,
  },
  perPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  perPersonName: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
    flex: 1,
  },
  perPersonInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  perPersonPrefix: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.inkSoft,
  },
  perPersonSuffix: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
  },
  perPersonInput: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: typography.body,
    color: palette.ink,
    backgroundColor: palette.surface,
    width: 90,
    textAlign: "right",
  },
  button: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    marginTop: 4,
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
    paddingVertical: 4,
  },
  cancelText: {
    color: palette.inkSoft,
    fontFamily: typography.body,
    fontSize: 16,
  },
});
