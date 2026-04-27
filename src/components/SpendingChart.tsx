import { StyleSheet, Text, View } from "react-native";
import { CATEGORIES, getCategoryEmoji, Expense } from "../lib/settlement";
import { palette, radii, shadows, typography } from "../theme";

interface Props {
  expenses: Expense[];
}

export default function SpendingChart({ expenses }: Props) {
  if (expenses.length === 0) return null;

  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }

  const grand = Object.values(totals).reduce((a, b) => a + b, 0);

  const rows = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      pct: grand > 0 ? amount / grand : 0,
    }));

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Spending breakdown</Text>
      <Text style={styles.total}>₦{grand.toLocaleString()}</Text>
      <Text style={styles.totalLabel}>total across {expenses.length} expense{expenses.length !== 1 ? "s" : ""}</Text>

      <View style={styles.bars}>
        {rows.map(({ category, amount, pct }) => (
          <View key={category} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.emoji}>{getCategoryEmoji(category)}</Text>
              <Text style={styles.category}>{category}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(pct * 100, 2)}%` }]} />
            </View>
            <Text style={styles.amount}>₦{amount.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.ink,
    borderRadius: radii.lg,
    padding: 24,
    marginBottom: 18,
    ...shadows.card,
  },
  eyebrow: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.accentSoft,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  total: {
    fontFamily: typography.display,
    fontSize: 34,
    color: palette.surface,
  },
  totalLabel: {
    fontFamily: typography.body,
    fontSize: 13,
    color: "#D8D1C7",
    marginTop: 4,
    marginBottom: 24,
  },
  bars: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 110,
  },
  emoji: {
    fontSize: 15,
  },
  category: {
    fontFamily: typography.body,
    fontSize: 13,
    color: "#D8D1C7",
    flexShrink: 1,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
  },
  amount: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: palette.accentSoft,
    width: 80,
    textAlign: "right",
  },
});
