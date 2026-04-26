import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AddExpenseModal from "../../src/components/AddExpenseModal";
import AppScreen from "../../src/components/AppScreen";
import PaystackSheet from "../../src/components/PaystackSheet";
import {
  calculateBalances,
  getCategoryEmoji,
  getUserBalance,
  simplifyDebts,
  Transaction,
} from "../../src/lib/settlement";
import { useAuth } from "../../src/providers/AuthProvider";
import { useStore } from "../../src/store/useStore";
import { palette, radii, shadows, typography } from "../../src/theme";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Transaction | null>(null);
  const markSettled = useStore((s) => s.markSettled);
  const { user } = useAuth();

  const subscribeToGroup = useStore((s) => s.subscribeToGroup);

  useEffect(() => {
    const unsubscribe = subscribeToGroup(id);
    return unsubscribe;
  }, [id]);

  const group = useStore((s) => s.groups.find((g) => g.id === id));

  if (!group) {
    return (
      <AppScreen contentContainerStyle={styles.missingState}>
        <Text style={styles.missingTitle}>Group not found</Text>
        <Text style={styles.missingText}>
          This group may have been removed or the route is no longer valid.
        </Text>
      </AppScreen>
    );
  }
  const balances = calculateBalances(group.expenses, group.settlements);
  const settlements = simplifyDebts(balances);
  const currentUser = user?.email ?? group.members[0];
  const userBalance = getUserBalance(balances, currentUser);

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Group overview</Text>
        <Text style={styles.heading}>{group.name}</Text>
        <Text style={styles.members}>{group.members.join(" • ")}</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{group.expenses.length}</Text>
            <Text style={styles.heroStatLabel}>Expenses</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{settlements.length}</Text>
            <Text style={styles.heroStatLabel}>Open settlements</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.balanceCard,
          userBalance > 0
            ? styles.balancePositive
            : userBalance < 0
              ? styles.balanceNegative
              : styles.balanceZero,
        ]}
      >
        <Text style={styles.balanceEyebrow}>Balance for {currentUser}</Text>
        <Text style={styles.balanceLabel}>
          {userBalance > 0
            ? "You are owed"
            : userBalance < 0
              ? "You owe"
              : "You are settled up"}
        </Text>
        {userBalance !== 0 ? (
          <Text style={styles.balanceAmount}>
            ₦{Math.abs(userBalance).toLocaleString()}
          </Text>
        ) : (
          <Text style={styles.balanceZeroText}>
            Nothing outstanding right now
          </Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Suggested settlements</Text>
        <Text style={styles.sectionHint}>Tap once payment is completed</Text>
      </View>

      {settlements.length > 0 ? (
        settlements.map((settlement, index) => (
          <View
            key={`${settlement.from}-${settlement.to}-${index}`}
            style={styles.settlementCard}
          >
            <View style={styles.settlementContent}>
              <Text style={styles.settlementText}>
                <Text style={styles.name}>{settlement.from}</Text>
                {" owes "}
                <Text style={styles.name}>{settlement.to}</Text>
              </Text>
              <Text style={styles.amount}>
                ₦{settlement.amount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.settlementActions}>
              <Pressable
                onPress={() => setActivePayment(settlement)}
                style={styles.payButton}
              >
                <Text style={styles.payButtonText}>Pay Now</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  markSettled(group.id, settlement.from, settlement.to, settlement.amount)
                }
                style={styles.settleButton}
              >
                <Text style={styles.settleButtonText}>Mark Settled</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>All settled</Text>
          <Text style={styles.emptyText}>
            Once expenses create an outstanding balance, recommended settlements
            will appear here.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Expense ledger</Text>
        <Text style={styles.sectionHint}>
          Every item is split evenly for now
        </Text>
      </View>

      {group.expenses.length > 0 ? (
        group.expenses.map((expense) => (
          <View key={expense.id} style={styles.expenseCard}>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseTitle}>
                {getCategoryEmoji(expense.category)} {expense.title}
              </Text>
              <Text style={styles.expensePaidBy}>{expense.paidBy} paid</Text>
              <Text style={styles.expenseParticipants}>
                {expense.splitMode === "even" ? "Split evenly" : `Custom split (${expense.splitMode})`}
                {" · "}
                {expense.participants.join(", ")}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>
              ₦{expense.amount.toLocaleString()}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No expenses yet</Text>
          <Text style={styles.emptyText}>
            Add the first payment to start calculating balances for this group.
          </Text>
        </View>
      )}

      <Pressable onPress={() => setModalOpen(true)} style={styles.button}>
        <Text style={styles.buttonText}>Add Expense</Text>
      </Pressable>

      <AddExpenseModal open={modalOpen} setOpen={setModalOpen} group={group} />

      {activePayment && (
        <PaystackSheet
          visible={!!activePayment}
          amount={activePayment.amount}
          email={user?.email ?? "user@debtsync.app"}
          from={activePayment.from}
          to={activePayment.to}
          onSuccess={(ref) => {
            markSettled(group.id, activePayment.from, activePayment.to, activePayment.amount, ref);
            setActivePayment(null);
          }}
          onCancel={() => setActivePayment(null)}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
  },
  missingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  missingTitle: {
    fontFamily: typography.display,
    fontSize: 28,
    color: palette.ink,
    marginBottom: 10,
  },
  missingText: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft,
    textAlign: "center",
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
  },
  members: {
    fontFamily: typography.body,
    fontSize: 14,
    color: "#D8D1C7",
    marginTop: 10,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    padding: 16,
  },
  heroStatValue: {
    fontFamily: typography.display,
    fontSize: 26,
    color: palette.surface,
    marginBottom: 6,
  },
  heroStatLabel: {
    fontFamily: typography.body,
    fontSize: 13,
    color: "#D8D1C7",
  },
  sectionTitle: {
    fontFamily: typography.display,
    fontSize: 26,
    color: palette.ink,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 12,
  },
  sectionHint: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 4,
  },
  settlementCard: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 12,
    ...shadows.card,
  },
  settlementContent: {
    marginBottom: 14,
  },
  settlementText: {
    fontFamily: typography.body,
    fontSize: 15,
    color: palette.inkSoft,
  },
  name: {
    fontFamily: typography.bodyMedium,
    color: palette.ink,
  },
  amount: {
    fontFamily: typography.display,
    fontSize: 16,
    color: palette.ink,
    marginTop: 8,
  },
  expenseCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    marginBottom: 12,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  expenseInfo: {
    flex: 1,
    paddingRight: 18,
  },
  expenseTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    color: palette.ink,
    marginBottom: 4,
  },
  expensePaidBy: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
  },
  expenseParticipants: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 6,
  },
  expenseAmount: {
    fontFamily: typography.display,
    fontSize: 16,
    color: palette.ink,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 20,
    ...shadows.card,
  },
  emptyTitle: {
    fontFamily: typography.display,
    fontSize: 22,
    color: palette.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSoft,
  },
  button: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    marginTop: 18,
    ...shadows.card,
  },
  buttonText: {
    color: palette.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 16,
  },
  balanceCard: {
    padding: 20,
    borderRadius: radii.md,
    marginBottom: 10,
    borderWidth: 1,
    ...shadows.card,
  },
  balanceEyebrow: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: palette.inkSoft,
    marginBottom: 12,
  },
  balancePositive: {
    backgroundColor: palette.positiveSoft,
    borderColor: "#CFE5D9",
  },
  balanceNegative: {
    backgroundColor: palette.negativeSoft,
    borderColor: "#EDD2CC",
  },
  balanceZero: {
    backgroundColor: palette.neutralSoft,
    borderColor: palette.line,
  },
  balanceLabel: {
    fontFamily: typography.display,
    fontSize: 26,
    color: palette.ink,
  },
  balanceAmount: {
    fontFamily: typography.display,
    fontSize: 34,
    color: palette.ink,
    marginTop: 10,
  },
  balanceZeroText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: palette.inkSoft,
    marginTop: 10,
  },
  settlementActions: {
    flexDirection: "row",
    gap: 8,
  },
  payButton: {
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...shadows.card,
  },
  payButtonText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium,
    color: palette.surface,
  },
  settleButton: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  settleButtonText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium,
    color: palette.inkSoft,
  },
});
