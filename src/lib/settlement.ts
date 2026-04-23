export interface Expense {
  id: string;
  amount: number;
  paidBy: string;
  participants: string[];
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
}

export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[] = [],
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const { paidBy, amount, participants } of expenses) {
    const share = amount / participants.length;
    balances[paidBy] = (balances[paidBy] || 0) + amount - share;

    for (const person of participants) {
      if (person !== paidBy) {
        balances[person] = (balances[person] || 0) - share;
      }
    }
  }

  // Apply settlements as direct balance offsets
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
    if (balance > 0) creditors.push({ person, amount: balance });
    if (balance < 0) debtors.push({ person, amount: -balance });
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

    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  return transactions;
}

export function getUserBalance(
  balances: Record<string, number>,
  user: string,
): number {
  return Math.round(balances[user] || 0);
}
