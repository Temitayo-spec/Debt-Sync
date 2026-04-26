export type SplitMode = "even" | "exact" | "percent" | "shares";

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  paidBy: string;
  participants: string[];
  splitMode: SplitMode;
  splits: Record<string, number>;
  createdAt: string;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  paymentRef?: string;
  paymentMethod?: "manual" | "paystack";
  createdAt: string;
}

function getPersonShare(expense: Expense, person: string): number {
  const { amount, participants, splitMode, splits } = expense;
  switch (splitMode) {
    case "even":
      return amount / participants.length;
    case "exact":
      return splits[person] ?? 0;
    case "percent":
      return amount * ((splits[person] ?? 0) / 100);
    case "shares": {
      const totalShares = Object.values(splits).reduce((a, b) => a + b, 0);
      return totalShares > 0 ? amount * ((splits[person] ?? 0) / totalShares) : 0;
    }
  }
}

export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[] = [],
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const { paidBy, amount, participants } = expense;
    const payerShare = getPersonShare(expense, paidBy);
    balances[paidBy] = (balances[paidBy] || 0) + amount - payerShare;

    for (const person of participants) {
      if (person !== paidBy) {
        const share = getPersonShare(expense, person);
        balances[person] = (balances[person] || 0) - share;
      }
    }
  }

  for (const { from, to, amount } of settlements) {
    balances[from] = (balances[from] || 0) + amount;
    balances[to] = (balances[to] || 0) - amount;
  }

  return balances;
}

export function simplifyDebts(balances: Record<string, number>): Transaction[] {
  const creditors: { person: string; amount: number }[] = [];
  const debtors: { person: string; amount: number }[] = [];

  for (const [person, balance] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ person, amount: balance });
    if (balance < -0.01) debtors.push({ person, amount: -balance });
  }

  const transactions: Transaction[] = [];

  while (creditors.length && debtors.length) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const settled = Math.min(creditor.amount, debtor.amount);

    transactions.push({
      from: debtor.person,
      to: creditor.person,
      amount: Math.round(settled),
    });

    creditor.amount -= settled;
    debtor.amount -= settled;

    if (creditor.amount < 0.01) creditors.shift();
    if (debtor.amount < 0.01) debtors.shift();
  }

  return transactions;
}

export function getUserBalance(
  balances: Record<string, number>,
  user: string,
): number {
  return Math.round(balances[user] || 0);
}

export const CATEGORIES = [
  { label: "Food", emoji: "🍕" },
  { label: "Transport", emoji: "🚗" },
  { label: "Rent", emoji: "🏠" },
  { label: "Entertainment", emoji: "🎉" },
  { label: "Groceries", emoji: "🛒" },
  { label: "Travel", emoji: "✈️" },
  { label: "Utilities", emoji: "💡" },
  { label: "Health", emoji: "🏥" },
  { label: "Other", emoji: "📦" },
] as const;

export function getCategoryEmoji(label: string): string {
  return CATEGORIES.find((c) => c.label === label)?.emoji ?? "📦";
}

export type ActivityItem =
  | { kind: "expense"; data: Expense }
  | { kind: "settlement"; data: Settlement };

export function getActivityFeed(
  expenses: Expense[],
  settlements: Settlement[],
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...expenses.map((e) => ({ kind: "expense" as const, data: e })),
    ...settlements.map((s) => ({ kind: "settlement" as const, data: s })),
  ];
  return items.sort(
    (a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime(),
  );
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
