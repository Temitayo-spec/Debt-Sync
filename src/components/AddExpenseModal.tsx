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
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { Group, uploadReceipt, useStore } from "../store/useStore";
import { CATEGORIES, Recurrence, SplitMode } from "../lib/settlement";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  group: Group;
  editingExpense?: import("../lib/settlement").Expense;
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

export default function AddExpenseModal({ open, setOpen, group, editingExpense }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(group.members[0]);
  const [participants, setParticipants] = useState<string[]>(group.members);
  const [guestName, setGuestName] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [splits, setSplits] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);

  // pre-populate when editing
  useEffect(() => {
    if (open && editingExpense) {
      setTitle(editingExpense.title);
      setCategory(editingExpense.category);
      setAmount(String(editingExpense.amount));
      setPaidBy(editingExpense.paidBy);
      setSplitMode(editingExpense.splitMode);
      setSplits(
        Object.fromEntries(
          Object.entries(editingExpense.splits).map(([k, v]) => [k, String(v)]),
        ),
      );
      setReceiptUri(editingExpense.receiptUrl);
      setRecurrence(editingExpense.recurrence ?? "none");
      setParticipants(editingExpense.participants);
    } else if (open) {
      setTitle("");
      setCategory("Food");
      setAmount("");
      setPaidBy(group.members[0]);
      setParticipants(group.members);
      setGuestName("");
      setSplitMode("even");
      setSplits({});
      setReceiptUri(undefined);
      setRecurrence("none");
    }
  }, [open]);

  const parsedAmount = parseFloat(amount) || 0;

  const handleModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    setSplits(initSplits(mode, participants, amount));
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (splitMode === "exact") {
      const total = parseFloat(val) || 0;
      const share = total > 0 ? Math.floor(total / participants.length).toString() : "";
      setSplits(Object.fromEntries(participants.map((m) => [m, share])));
    }
  };

  const toggleParticipant = (name: string) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name || participants.includes(name)) return;
    setParticipants((prev) => [...prev, name]);
    setGuestName("");
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

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleAdd = async () => {
    if (!canSubmit) return;

    setUploadingReceipt(true);

    let finalReceiptUrl: string | undefined = receiptUri;
    // upload only if it's a new local file (not already an https URL)
    if (receiptUri && !receiptUri.startsWith("http")) {
      const uploaded = await uploadReceipt(receiptUri);
      finalReceiptUrl = uploaded ?? undefined;
    }

    setUploadingReceipt(false);

    const parsedSplits: Record<string, number> =
      splitMode !== "even"
        ? Object.fromEntries(
            Object.entries(splits).map(([k, v]) => [k, parseFloat(v) || 0]),
          )
        : {};

    const payload = {
      title: title.trim(),
      category,
      amount: parsedAmount,
      paidBy,
      participants,
      splitMode,
      splits: parsedSplits,
      receiptUrl: finalReceiptUrl,
      recurrence,
    };

    if (editingExpense) {
      updateExpense(group.id, editingExpense.id, payload);
    } else {
      addExpense(group.id, payload);
    }

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
            <Text style={styles.heading}>{editingExpense ? "Edit Expense" : "Add Expense"}</Text>

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
              {CATEGORIES.map((cat) => {
                const active = category === cat.label;
                return (
                  <Pressable
                    key={cat.label}
                    onPress={() => setCategory(cat.label)}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={active ? palette.accentSoft : palette.inkSoft}
                    />
                    <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
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
              {participants.map((member) => (
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

            {/* Participants */}
            <Text style={styles.label}>Participants</Text>
            <View style={styles.chipRow}>
              {[...group.members, ...participants.filter((p) => !group.members.includes(p))].map((member) => {
                const included = participants.includes(member);
                const isGuest = !group.members.includes(member);
                return (
                  <Pressable
                    key={member}
                    onPress={() => toggleParticipant(member)}
                    style={[styles.chip, included && styles.chipActive]}
                  >
                    {isGuest && (
                      <Ionicons name="person-add-outline" size={12} color={included ? palette.surface : palette.inkSoft} />
                    )}
                    <Text style={[styles.chipText, included && styles.chipTextActive]}>
                      {member}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.guestRow}>
              <TextInput
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Add guest by name…"
                placeholderTextColor={palette.inkFaint}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                returnKeyType="done"
                onSubmitEditing={addGuest}
              />
              <Pressable
                onPress={addGuest}
                style={[styles.guestAddButton, !guestName.trim() && styles.guestAddButtonDisabled]}
                disabled={!guestName.trim()}
              >
                <Ionicons name="add" size={18} color={palette.surface} />
              </Pressable>
            </View>

            {/* Split mode */}
            <Text style={[styles.label, { marginTop: 20 }]}>Split</Text>
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
                {parsedAmount > 0 && (
                  <Text style={[styles.splitTotal, !splitValid && styles.splitTotalWarning]}>
                    {getSplitHint()}
                  </Text>
                )}
                {participants.map((member) => (
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

            {/* Recurrence */}
            <Text style={styles.label}>Repeat</Text>
            <View style={styles.recurrenceRow}>
              {(["none", "weekly", "monthly"] as Recurrence[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRecurrence(r)}
                  style={[styles.recurrenceChip, recurrence === r && styles.recurrenceChipActive]}
                >
                  <Text style={[styles.recurrenceText, recurrence === r && styles.recurrenceTextActive]}>
                    {r === "none" ? "Never" : r === "weekly" ? "Weekly" : "Monthly"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Receipt */}
            <Text style={styles.label}>Receipt (optional)</Text>
            {receiptUri ? (
              <View style={styles.receiptPreview}>
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
                <Pressable onPress={() => setReceiptUri(undefined)} style={styles.receiptRemove}>
                  <Ionicons name="close-circle" size={22} color={palette.negative} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.receiptRow}>
                <Pressable onPress={pickReceipt} style={styles.receiptButton}>
                  <Ionicons name="image-outline" size={18} color={palette.inkSoft} />
                  <Text style={styles.receiptButtonText}>Gallery</Text>
                </Pressable>
                <Pressable onPress={takePhoto} style={styles.receiptButton}>
                  <Ionicons name="camera-outline" size={18} color={palette.inkSoft} />
                  <Text style={styles.receiptButtonText}>Camera</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={handleAdd}
              style={[styles.button, (!canSubmit || uploadingReceipt) && styles.buttonDisabled]}
              disabled={uploadingReceipt}
            >
              {uploadingReceipt ? (
                <Text style={styles.buttonText}>Uploading receipt…</Text>
              ) : (
                <Text style={styles.buttonText}>{editingExpense ? "Save Changes" : "Add Expense"}</Text>
              )}
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
  guestRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 4,
  },
  guestAddButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  guestAddButtonDisabled: {
    backgroundColor: palette.inkFaint,
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
  recurrenceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  recurrenceChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  recurrenceChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  recurrenceText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
  recurrenceTextActive: {
    color: palette.surface,
  },
  receiptRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  receiptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  receiptButtonText: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
  },
  receiptPreview: {
    marginBottom: 20,
    borderRadius: radii.md,
    overflow: "hidden",
    position: "relative",
  },
  receiptImage: {
    width: "100%",
    height: 160,
    borderRadius: radii.md,
  },
  receiptRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: palette.surface,
    borderRadius: 11,
  },
});
