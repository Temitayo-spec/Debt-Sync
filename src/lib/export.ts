import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Expense, Settlement } from "./settlement";

function escapeCSV(value: string | number): string {
  const str = String(value);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export async function exportGroupCSV(
  groupName: string,
  expenses: Expense[],
  settlements: Settlement[],
): Promise<void> {
  const rows: string[] = [
    ["Type", "Date", "Title / From → To", "Category", "Amount (₦)", "Paid By / Method", "Participants", "Split"].join(","),
  ];

  for (const e of expenses) {
    rows.push(
      [
        "Expense",
        new Date(e.createdAt).toLocaleDateString("en-NG"),
        escapeCSV(e.title),
        escapeCSV(e.category),
        e.amount,
        escapeCSV(e.paidBy),
        escapeCSV(e.participants.join("; ")),
        e.splitMode,
      ].join(","),
    );
  }

  for (const s of settlements) {
    rows.push(
      [
        "Settlement",
        new Date(s.createdAt).toLocaleDateString("en-NG"),
        escapeCSV(`${s.from} → ${s.to}`),
        "",
        s.amount,
        "manual",
        "",
        "",
      ].join(","),
    );
  }

  const csv = rows.join("\n");
  const filename = `${groupName.replace(/\s+/g, "_")}_ledger_${Date.now()}.csv`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      dialogTitle: `Export ${groupName} ledger`,
    });
  }
}
