import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { exportGroupCSV } from "../../src/lib/export";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import AddExpenseModal from "../../src/components/AddExpenseModal";
import AppScreen from "../../src/components/AppScreen";
import CommentsSheet from "../../src/components/CommentsSheet";
import GroupSettingsSheet from "../../src/components/GroupSettingsSheet";
import SpendingChart from "../../src/components/SpendingChart";
import {
  calculateBalances,
  getActivityFeed,
  getCategoryIcon,
  getUserBalance,
  simplifyDebts,
  timeAgo,
} from "../../src/lib/settlement";
import { useAuth } from "../../src/providers/AuthProvider";
import { useStore } from "../../src/store/useStore";
import { palette, radii, shadows, typography } from "../../src/theme";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<import("../../src/lib/settlement").Expense | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [commentingExpense, setCommentingExpense] = useState<import("../../src/lib/settlement").Expense | null>(null);
  const markSettled = useStore((s) => s.markSettled);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const processRecurring = useStore((s) => s.processRecurring);
  const { user } = useAuth();

  const subscribeToGroup = useStore((s) => s.subscribeToGroup);

  useEffect(() => {
    const unsubscribe = subscribeToGroup(id);
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (group) processRecurring(id);
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
  const activityFeed = getActivityFeed(group.expenses, group.settlements);
  const totalSpent = group.expenses.reduce((s, e) => s + e.amount, 0);

  const usedCategories = [...new Set(group.expenses.map((e) => e.category))];

  const filteredExpenses = group.expenses.filter((e) => {
    const matchesSearch =
      search.trim() === "" ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.paidBy.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === null || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleShare = () => {
    const settlementLines =
      settlements.length > 0
        ? settlements.map((s) => `• ${s.from} → ${s.to}: ₦${s.amount.toLocaleString()}`).join("\n")
        : "Everyone is settled up ✅";

    const memberBalanceLines = group.members
      .map((m) => {
        const bal = getUserBalance(balances, m);
        const sign = bal > 0 ? "+" : "";
        return `• ${m}: ${sign}₦${Math.abs(bal).toLocaleString()}`;
      })
      .join("\n");

    const message = [
      `📊 *${group.name}* — Group Summary`,
      ``,
      `👥 Members: ${group.members.join(", ")}`,
      `💰 Total spent: ₦${totalSpent.toLocaleString()} across ${group.expenses.length} expense${group.expenses.length !== 1 ? "s" : ""}`,
      ``,
      `⚖️ *Balances:*`,
      memberBalanceLines,
      ``,
      `📋 *Suggested settlements:*`,
      settlementLines,
      ``,
      `_Tracked on Debt Sync_`,
    ].join("\n");

    Share.share({ message });
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={14} color={palette.ink} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.topRowRight}>
          <Pressable onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={14} color={palette.inkSoft} />
            <Text style={styles.shareButtonText}>Share</Text>
          </Pressable>
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.settingsButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={palette.inkSoft} />
          </Pressable>
        </View>
      </View>

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

      <SpendingChart expenses={group.expenses} />

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
        settlements.map((settlement, index) => {
          const iAmPaying = settlement.from === currentUser;
          const iAmReceiving = settlement.to === currentUser;
          const recipientInfo = group.memberPaymentInfo[settlement.to];
          const myInfo = group.memberPaymentInfo[currentUser];

          const buildNudgeMessage = () => {
            if (iAmReceiving && myInfo) {
              return encodeURIComponent(
                `Hey ${settlement.from}! You owe me ₦${settlement.amount.toLocaleString()} on Debt Sync.\n\nTransfer to:\n🏦 ${myInfo.bankName}\n👤 ${myInfo.accountName}\n🔢 ${myInfo.accountNumber}\n\nThanks! 💸`,
              );
            }
            return encodeURIComponent(
              `Hey ${settlement.from}! You owe ${settlement.to} ₦${settlement.amount.toLocaleString()} on Debt Sync. Settle up when you can 💸`,
            );
          };

          return (
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

              {iAmPaying && (
                recipientInfo ? (
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankDetailsLabel}>Pay to</Text>
                    <View style={styles.bankDetailsRow}>
                      <View style={styles.bankDetailsInfo}>
                        <View style={styles.bankDetailRow}>
                          <Ionicons name="business-outline" size={13} color={palette.inkSoft} />
                          <Text style={styles.bankDetailsBank}>{recipientInfo.bankName}</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                          <Ionicons name="person-outline" size={13} color={palette.inkSoft} />
                          <Text style={styles.bankDetailsName}>{recipientInfo.accountName}</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                          <Ionicons name="keypad-outline" size={13} color={palette.inkSoft} />
                          <Text style={styles.bankDetailsNumber}>{recipientInfo.accountNumber}</Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => Clipboard.setStringAsync(recipientInfo.accountNumber)}
                        style={styles.copyButton}
                        hitSlop={8}
                      >
                        <Text style={styles.copyButtonText}>Copy</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noBankDetails}>
                    <Text style={styles.noBankDetailsText}>
                      {settlement.to} hasn't added bank details yet. Nudge them to set it up.
                    </Text>
                  </View>
                )
              )}

              <View style={styles.settlementActions}>
                <Pressable
                  onPress={() =>
                    Linking.openURL(`whatsapp://send?text=${buildNudgeMessage()}`)
                  }
                  style={styles.nudgeButton}
                >
                  <Ionicons name="chatbubble-outline" size={13} color={palette.inkSoft} />
                  <Text style={styles.nudgeButtonText}>Nudge</Text>
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
          );
        })
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
          {filteredExpenses.length} of {group.expenses.length} expenses
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={palette.inkFaint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search expenses…"
          placeholderTextColor={palette.inkFaint}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category filter chips */}
      {usedCategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setFilterCategory(null)}
            style={[styles.filterChip, filterCategory === null && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filterCategory === null && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          {usedCategories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setFilterCategory(cat === filterCategory ? null : cat)}
              style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
            >
              <Ionicons
                name={getCategoryIcon(cat) as any}
                size={13}
                color={filterCategory === cat ? palette.surface : palette.inkSoft}
              />
              <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {filteredExpenses.length > 0 ? (
        filteredExpenses.map((expense) => {
          const commentCount = group.comments.filter((c) => c.expenseId === expense.id).length;
          return (
          <Pressable
            key={expense.id}
            style={styles.expenseCard}
            onPress={() => setCommentingExpense(expense)}
            onLongPress={() =>
              Alert.alert(expense.title, "What would you like to do?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Edit",
                  onPress: () => {
                    setEditingExpense(expense);
                    setModalOpen(true);
                  },
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteExpense(group.id, expense.id),
                },
              ])
            }
          >
            <View style={styles.expenseInfo}>
              <View style={styles.expenseTitleRow}>
                <Ionicons
                  name={getCategoryIcon(expense.category) as any}
                  size={14}
                  color={palette.accent}
                />
                <Text style={styles.expenseTitle}>{expense.title}</Text>
              </View>
              <View style={styles.expensePaidByRow}>
                <Text style={styles.expensePaidBy}>{expense.paidBy} paid</Text>
                {expense.recurrence !== "none" && !expense.recurrenceParentId && (
                  <View style={styles.recurBadge}>
                    <Ionicons name="repeat-outline" size={11} color={palette.accent} />
                    <Text style={styles.recurBadgeText}>{expense.recurrence}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.expenseParticipants}>
                {expense.splitMode === "even" ? "Split evenly" : `Custom split (${expense.splitMode})`}
                {" · "}
                {expense.participants.join(", ")}
              </Text>
              <View style={styles.expenseCommentRow}>
                <Ionicons name="chatbubble-outline" size={12} color={palette.inkFaint} />
                <Text style={styles.expenseCommentCount}>
                  {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? "s" : ""}` : "Add comment"}
                </Text>
              </View>
            </View>
            <View style={styles.expenseRight}>
              <Text style={styles.expenseAmount}>
                ₦{expense.amount.toLocaleString()}
              </Text>
              {expense.receiptUrl && (
                <Pressable onPress={(e) => { e.stopPropagation?.(); setViewingReceipt(expense.receiptUrl); }} hitSlop={8}>
                  <Image source={{ uri: expense.receiptUrl }} style={styles.receiptThumb} />
                </Pressable>
              )}
            </View>
          </Pressable>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {search || filterCategory ? "No matches" : "No expenses yet"}
          </Text>
          <Text style={styles.emptyText}>
            {search || filterCategory
              ? "Try a different search or category filter."
              : "Add the first payment to start calculating balances for this group."}
          </Text>
        </View>
      )}

      <View style={styles.bottomActions}>
        <Pressable onPress={() => setModalOpen(true)} style={[styles.button, { flex: 1 }]}>
          <Text style={styles.buttonText}>Add Expense</Text>
        </Pressable>
        <Pressable
          onPress={() => exportGroupCSV(group.name, group.expenses, group.settlements)}
          style={styles.exportButton}
        >
          <Ionicons name="download-outline" size={18} color={palette.inkSoft} />
        </Pressable>
      </View>

      {activityFeed.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.sectionHint}>Everything that's happened in this group</Text>
          </View>

          {activityFeed.map((item, index) =>
            item.kind === "expense" ? (
              <View key={item.data.id} style={styles.activityCard}>
                <View style={styles.activityLeft}>
                  <Ionicons
                    name={getCategoryIcon(item.data.category) as any}
                    size={18}
                    color={palette.accent}
                  />
                </View>
                <View style={styles.activityBody}>
                  <Text style={styles.activityTitle}>{item.data.title}</Text>
                  <Text style={styles.activitySub}>
                    {item.data.paidBy} paid · {item.data.category}
                  </Text>
                </View>
                <View style={styles.activityRight}>
                  <Text style={styles.activityAmount}>
                    ₦{item.data.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.activityTime}>{timeAgo(item.data.createdAt)}</Text>
                </View>
              </View>
            ) : (
              <View key={item.data.id} style={styles.activityCard}>
                <View style={styles.activityLeft}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={palette.positive}
                  />
                </View>
                <View style={styles.activityBody}>
                  <Text style={styles.activityTitle}>
                    {item.data.from} settled with {item.data.to}
                  </Text>
                  <Text style={styles.activitySub}>
                    {item.data.paymentMethod === "paystack" ? "Paid via Paystack" : "Marked manually"}
                  </Text>
                </View>
                <View style={styles.activityRight}>
                  <Text style={[styles.activityAmount, styles.activityAmountSettled]}>
                    ₦{item.data.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.activityTime}>{timeAgo(item.data.createdAt)}</Text>
                </View>
              </View>
            ),
          )}
        </>
      )}

      <CommentsSheet
        visible={!!commentingExpense}
        expense={commentingExpense}
        groupId={group.id}
        comments={group.comments}
        currentUserId={user?.id ?? ""}
        onClose={() => setCommentingExpense(null)}
      />

      <Modal visible={!!viewingReceipt} transparent animationType="fade">
        <Pressable style={styles.receiptOverlay} onPress={() => setViewingReceipt(undefined)}>
          {viewingReceipt && (
            <Image source={{ uri: viewingReceipt }} style={styles.receiptFull} resizeMode="contain" />
          )}
          <Pressable style={styles.receiptClose} onPress={() => setViewingReceipt(undefined)}>
            <Ionicons name="close" size={22} color={palette.surface} />
          </Pressable>
        </Pressable>
      </Modal>

      <AddExpenseModal
        open={modalOpen}
        setOpen={(v) => { setModalOpen(v); if (!v) setEditingExpense(undefined); }}
        group={group}
        editingExpense={editingExpense}
      />

      <GroupSettingsSheet
        visible={settingsOpen}
        group={group}
        currentUserId={user?.id ?? ""}
        onClose={() => setSettingsOpen(false)}
        onLeaveOrDelete={() => { setSettingsOpen(false); router.back(); }}
      />
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  backText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.ink,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
  },
  shareButtonText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
  topRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
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
  expenseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  expenseTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    color: palette.ink,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 15,
    color: palette.ink,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  filterChipText: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
  filterChipTextActive: {
    color: palette.surface,
  },
  expensePaidByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expensePaidBy: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
  },
  recurBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: palette.line,
  },
  recurBadgeText: {
    fontFamily: typography.bodyMedium,
    fontSize: 10,
    color: palette.accent,
    textTransform: "capitalize",
  },
  expenseCommentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  expenseCommentCount: {
    fontFamily: typography.body,
    fontSize: 11,
    color: palette.inkFaint,
  },
  expenseParticipants: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 6,
  },
  expenseRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  expenseAmount: {
    fontFamily: typography.display,
    fontSize: 16,
    color: palette.ink,
  },
  receiptThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptFull: {
    width: "90%",
    height: "70%",
  },
  receiptClose: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  bottomActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  button: {
    backgroundColor: palette.accent,
    padding: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    ...shadows.card,
  },
  buttonText: {
    color: palette.surface,
    fontFamily: typography.bodyMedium,
    fontSize: 16,
  },
  exportButton: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    ...shadows.card,
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
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadows.card,
  },
  activityLeft: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  activityBody: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
  },
  activitySub: {
    fontFamily: typography.body,
    fontSize: 12,
    color: palette.inkSoft,
  },
  activityRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  activityAmount: {
    fontFamily: typography.display,
    fontSize: 14,
    color: palette.ink,
  },
  activityAmountSettled: {
    color: palette.positive,
  },
  activityTime: {
    fontFamily: typography.body,
    fontSize: 11,
    color: palette.inkFaint,
  },
  bankDetails: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.line,
  },
  bankDetailsLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.inkFaint,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bankDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankDetailsInfo: {
    gap: 6,
  },
  bankDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bankDetailsBank: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
  },
  bankDetailsName: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
  },
  bankDetailsNumber: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: palette.ink,
    letterSpacing: 1,
  },
  copyButton: {
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyButtonText: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: palette.surface,
  },
  noBankDetails: {
    backgroundColor: palette.negativeSoft,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#EDD2CC",
  },
  noBankDetailsText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.negative,
    lineHeight: 19,
  },
  settlementActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 8,
  },
  nudgeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
  },
  nudgeButtonText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium,
    color: palette.inkSoft,
  },
  settleButton: {
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...shadows.card,
  },
  settleButtonText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium,
    color: palette.surface,
  },
});
