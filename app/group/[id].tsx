import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import AddExpenseModal from "../../src/components/AddExpenseModal";
import {
  calculateBalances,
  getUserBalance,
  simplifyDebts,
} from "../../src/lib/settlement";
import { useStore } from "../../src/store/useStore";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const markSettled = useStore((s) => s.markSettled);

  const group = useStore((s) => s.groups.find((g) => g.id === id));

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>Group not found.</Text>
      </View>
    );
  }
const balances = calculateBalances(group.expenses, group.settlements);
  const settlements = simplifyDebts(balances);
  const currentUser = group.members[0]; // temporary until auth
  const userBalance = getUserBalance(balances, currentUser);
  return (
    <View style={styles.container}>
      {/* Header */}
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.heading}>{group.name}</Text>
      <Text style={styles.members}>{group.members.join(", ")}</Text>

      {/* Balance Summary */}
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
        <Text style={styles.balanceLabel}>
          {userBalance > 0
            ? "You are owed"
            : userBalance < 0
              ? "You owe"
              : "You are settled up"}
        </Text>
        {userBalance !== 0 && (
          <Text style={styles.balanceAmount}>
            ₦{Math.abs(userBalance).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Settlements */}
      <Text style={styles.sectionTitle}>Settlements</Text>
      {settlements.map((s, i) => (
        <View key={i} style={styles.settlementCard}>
          <View>
            <Text style={styles.settlementText}>
              <Text style={styles.name}>{s.from}</Text>
              {" owes "}
              <Text style={styles.name}>{s.to}</Text>
            </Text>
            <Text style={styles.amount}>₦{s.amount.toLocaleString()}</Text>
          </View>
          <Pressable
            onPress={() => markSettled(group.id, s.from, s.to, s.amount)}
            style={styles.settleButton}
          >
            <Text style={styles.settleButtonText}>Mark Settled</Text>
          </Pressable>
        </View>
      ))}

      {/* Expenses */}
      <Text style={styles.sectionTitle}>Expenses</Text>
      <FlatList
        data={group.expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.expenseCard}>
            <View>
              <Text style={styles.expensePaidBy}>{item.paidBy} paid</Text>
              <Text style={styles.expenseParticipants}>
                {item.participants.join(", ")}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>
              ₦{item.amount.toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses added yet.</Text>
        }
      />

      {/* Add Expense Button */}
      <Pressable onPress={() => setModalOpen(true)} style={styles.button}>
        <Text style={styles.buttonText}>+ Add Expense</Text>
      </Pressable>

      <AddExpenseModal open={modalOpen} setOpen={setModalOpen} group={group} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  back: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: "#888",
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
  },
  members: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  settlementCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
  },
  settlementText: {
    fontSize: 15,
    color: "#333",
  },
  name: {
    fontWeight: "600",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  expenseCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 8,
  },
  expensePaidBy: {
    fontSize: 15,
    fontWeight: "600",
  },
  expenseParticipants: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  empty: {
    color: "#aaa",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  balancePositive: {
    backgroundColor: "#e6f4ea",
  },
  balanceNegative: {
    backgroundColor: "#fce8e6",
  },
  balanceZero: {
    backgroundColor: "#f5f5f5",
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  settleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
  },
  settleButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
});
