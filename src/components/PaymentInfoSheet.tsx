import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import { palette, radii, shadows, typography } from "../theme";

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank",
  "Ecobank",
  "Fidelity Bank",
  "First Bank",
  "FCMB",
  "GTBank",
  "Heritage Bank",
  "Keystone Bank",
  "Kuda Bank",
  "Moniepoint",
  "OPay",
  "PalmPay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC",
  "Standard Chartered",
  "Sterling Bank",
  "UBA",
  "Union Bank",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

type Step = "form" | "bank";

export default function PaymentInfoSheet({ visible, userId, onClose }: Props) {
  const fetchGroups = useStore((s) => s.fetchGroups);

  const [step, setStep] = useState<Step>("form");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep("form");
    setBankSearch("");
    setLoading(true);

    supabase
      .from("profiles")
      .select("bank_name, account_number, account_name")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setBankName(data.bank_name ?? "");
          setAccountNumber(data.account_number ?? "");
          setAccountName(data.account_name ?? "");
        }
        setLoading(false);
      });
  }, [visible, userId]);

  const filteredBanks = NIGERIAN_BANKS.filter((b) =>
    b.toLowerCase().includes(bankSearch.toLowerCase()),
  );

  const canSave =
    bankName.trim().length > 0 &&
    accountNumber.trim().length >= 10 &&
    accountName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      })
      .eq("id", userId);

    await fetchGroups();
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {step === "bank" ? (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.heading}>Choose Bank</Text>
                <Pressable onPress={() => setStep("form")} hitSlop={12}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <TextInput
                placeholder="Search banks…"
                placeholderTextColor={palette.inkFaint}
                value={bankSearch}
                onChangeText={setBankSearch}
                style={styles.searchInput}
                autoFocus
              />

              <FlatList
                data={filteredBanks}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setBankName(item);
                      setStep("form");
                    }}
                    style={[
                      styles.bankRow,
                      bankName === item && styles.bankRowActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bankRowText,
                        bankName === item && styles.bankRowTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {bankName === item && (
                      <Text style={styles.bankCheck}>✓</Text>
                    )}
                  </Pressable>
                )}
              />
            </>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.heading}>Payment Details</Text>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.subheading}>
                Group members will see these details when they need to pay you.
              </Text>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={palette.accent} />
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Bank</Text>
                  <Pressable
                    onPress={() => setStep("bank")}
                    style={styles.bankPicker}
                  >
                    <Text
                      style={[
                        styles.bankPickerText,
                        !bankName && styles.bankPickerPlaceholder,
                      ]}
                    >
                      {bankName || "Select your bank"}
                    </Text>
                    <Text style={styles.bankPickerArrow}>›</Text>
                  </Pressable>

                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    placeholder="e.g. 0123456789"
                    placeholderTextColor={palette.inkFaint}
                    keyboardType="number-pad"
                    value={accountNumber}
                    onChangeText={(v) => setAccountNumber(v.replace(/\D/g, "").slice(0, 10))}
                    style={styles.input}
                    maxLength={10}
                  />

                  <Text style={styles.label}>Account Name</Text>
                  <TextInput
                    placeholder="e.g. John Doe"
                    placeholderTextColor={palette.inkFaint}
                    value={accountName}
                    onChangeText={setAccountName}
                    style={styles.input}
                    autoCapitalize="words"
                  />

                  {bankName && accountNumber && accountName ? (
                    <View style={styles.preview}>
                      <Text style={styles.previewLabel}>Preview</Text>
                      <Text style={styles.previewText}>
                        🏦 {bankName}{"  "}·{"  "}👤 {accountName}{"  "}·{"  "}🔢 {accountNumber}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleSave}
                    style={[styles.button, (!canSave || saving) && styles.buttonDisabled]}
                    disabled={!canSave || saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={palette.surface} />
                    ) : (
                      <Text style={styles.buttonText}>Save Payment Details</Text>
                    )}
                  </Pressable>

                  <View style={{ height: 16 }} />
                </>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(28, 25, 23, 0.32)",
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: "85%",
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: 22,
    color: palette.ink,
  },
  closeText: {
    fontSize: 18,
    color: palette.inkSoft,
    paddingHorizontal: 4,
  },
  subheading: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.inkSoft,
    lineHeight: 21,
    marginBottom: 24,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bankPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: palette.surfaceMuted,
    marginBottom: 20,
  },
  bankPickerText: {
    fontFamily: typography.body,
    fontSize: 16,
    color: palette.ink,
  },
  bankPickerPlaceholder: {
    color: palette.inkFaint,
  },
  bankPickerArrow: {
    fontSize: 20,
    color: palette.inkSoft,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: typography.body,
    color: palette.ink,
    backgroundColor: palette.surfaceMuted,
    marginBottom: 20,
  },
  preview: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.line,
  },
  previewLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.inkFaint,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  previewText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.ink,
    lineHeight: 20,
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
  searchInput: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.body,
    color: palette.ink,
    backgroundColor: palette.surfaceMuted,
    marginBottom: 12,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  bankRowActive: {
    backgroundColor: palette.surfaceMuted,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  bankRowText: {
    fontFamily: typography.body,
    fontSize: 16,
    color: palette.ink,
  },
  bankRowTextActive: {
    fontFamily: typography.bodyMedium,
    color: palette.accent,
  },
  bankCheck: {
    fontSize: 16,
    color: palette.accent,
  },
});
