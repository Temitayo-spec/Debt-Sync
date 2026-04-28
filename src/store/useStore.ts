import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  Comment,
  Expense,
  Recurrence,
  Settlement,
  SplitMode,
} from "../lib/settlement";
import { supabase } from "../lib/supabase";

export const storage = createMMKV();

const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.remove(name);
  },
};

export type PendingAction =
  | {
      type: "addExpense";
      groupId: string;
      expense: Omit<Expense, "id" | "createdAt">;
    }
  | {
      type: "markSettled";
      groupId: string;
      from: string;
      to: string;
      amount: number;
    }
  | { type: "deleteExpense"; groupId: string; expenseId: string };

export async function uploadReceipt(localUri: string): Promise<string | null> {
  const ext = localUri.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(filename, blob, { contentType: `image/${ext}` });

  if (error || !data) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("receipts").getPublicUrl(data.path);
  return publicUrl;
}

export interface PaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: string[];
  memberIds: Record<string, string>; // name -> user_id
  memberPaymentInfo: Record<string, PaymentInfo>;
  expenses: Expense[];
  settlements: Settlement[];
  comments: Comment[];
  budget?: number;
}

interface Store {
  groups: Group[];
  isSyncing: boolean;
  isOnline: boolean;
  pendingActions: PendingAction[];
  setOnline: (online: boolean) => void;
  processPendingActions: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  addExpense: (
    groupId: string,
    expense: Omit<Expense, "id" | "createdAt">,
  ) => Promise<void>;
  updateExpense: (
    groupId: string,
    expenseId: string,
    updates: Omit<Expense, "id" | "createdAt">,
  ) => Promise<void>;
  processRecurring: (groupId: string) => Promise<void>;
  addComment: (
    groupId: string,
    expenseId: string,
    body: string,
  ) => Promise<void>;
  markSettled: (
    groupId: string,
    from: string,
    to: string,
    amount: number,
  ) => Promise<void>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<void>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  setBudget: (groupId: string, budget: number | null) => Promise<void>;
  removeGroupMember: (
    groupId: string,
    memberUserId: string,
    memberName: string,
  ) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  subscribeToGroup: (groupId: string) => () => void;
  joinGroup: (inviteCode: string) => Promise<{ error: string | null }>;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      groups: [],
      isSyncing: false,
      isOnline: true,
      pendingActions: [],

      setOnline: (online) => {
        set({ isOnline: online });
      },

      processPendingActions: async () => {
        const { pendingActions } = get();
        if (!pendingActions.length) return;

        set({ pendingActions: [] });

        for (const action of pendingActions) {
          if (action.type === "addExpense") {
            await get().addExpense(action.groupId, action.expense);
          } else if (action.type === "markSettled") {
            await get().markSettled(
              action.groupId,
              action.from,
              action.to,
              action.amount,
            );
          } else if (action.type === "deleteExpense") {
            await get().deleteExpense(action.groupId, action.expenseId);
          }
        }

        await get().fetchGroups();
      },

      fetchGroups: async () => {
        set({ isSyncing: true });

        const { data: groupRows, error } = await supabase
          .from("groups")
          .select("*")
          .order("created_at", { ascending: false });

        if (error || !groupRows) {
          set({ isSyncing: false });
          return;
        }

        const groups: Group[] = await Promise.all(
          groupRows.map(async (g) => {
            const [
              { data: members },
              { data: expenses },
              { data: settlements },
              { data: commentsData },
            ] = await Promise.all([
              supabase
                .from("group_members")
                .select(
                  "name, user_id, profiles(bank_name, account_number, account_name)",
                )
                .eq("group_id", g.id),
              supabase
                .from("expenses")
                .select("*")
                .eq("group_id", g.id)
                .order("created_at", { ascending: true }),
              supabase
                .from("settlements")
                .select("*")
                .eq("group_id", g.id)
                .order("created_at", { ascending: true }),
              supabase
                .from("comments")
                .select("*")
                .eq("group_id", g.id)
                .order("created_at", { ascending: true }),
            ]);

            const memberPaymentInfo: Record<string, PaymentInfo> = {};
            const memberIds: Record<string, string> = {};
            members?.forEach((m: any) => {
              memberIds[m.name] = m.user_id;
              const p = m.profiles;
              if (p?.bank_name && p?.account_number && p?.account_name) {
                memberPaymentInfo[m.name] = {
                  bankName: p.bank_name,
                  accountNumber: p.account_number,
                  accountName: p.account_name,
                };
              }
            });

            return {
              id: g.id,
              name: g.name,
              inviteCode: g.invite_code,
              createdBy: g.created_by,
              budget: g.budget ?? undefined,
              members: members?.map((m: any) => m.name) ?? [],
              memberIds,
              memberPaymentInfo,
              expenses:
                expenses?.map((e) => ({
                  id: e.id,
                  title: e.title ?? "Shared expense",
                  category: e.category ?? "Other",
                  amount: e.amount,
                  paidBy: e.paid_by,
                  participants: e.participants,
                  splitMode: (e.split_mode ?? "even") as SplitMode,
                  splits: (e.splits ?? {}) as Record<string, number>,
                  createdAt: e.created_at ?? new Date().toISOString(),
                  receiptUrl: e.receipt_url ?? undefined,
                  recurrence: (e.recurrence ?? "none") as Recurrence,
                  recurrenceParentId: e.recurrence_parent_id ?? undefined,
                })) ?? [],
              settlements:
                settlements?.map((s) => ({
                  id: s.id,
                  from: s.from,
                  to: s.to,
                  amount: s.amount,
                  paymentRef: s.payment_ref ?? undefined,
                  paymentMethod: s.payment_method ?? "manual",
                  createdAt: s.created_at ?? new Date().toISOString(),
                })) ?? [],
              comments:
                commentsData?.map((c) => ({
                  id: c.id,
                  expenseId: c.expense_id,
                  groupId: c.group_id,
                  userId: c.user_id,
                  authorName: c.author_name,
                  body: c.body,
                  createdAt: c.created_at ?? new Date().toISOString(),
                })) ?? [],
            };
          }),
        );

        set({ groups, isSyncing: false });
      },

      createGroup: async (name) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const inviteCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();

        const { data: group, error } = await supabase
          .from("groups")
          .insert({ name, created_by: user.id, invite_code: inviteCode })
          .select()
          .single();

        if (error || !group) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const creatorName =
          profile?.full_name?.trim() || user.email?.split("@")[0] || "You";

        await supabase.from("group_members").insert({
          group_id: group.id,
          name: creatorName,
          user_id: user.id,
        });

        const newGroup: Group = {
          id: group.id,
          name: group.name,
          inviteCode: group.invite_code,
          createdBy: user.id,
          members: [creatorName],
          memberIds: { [creatorName]: user.id },
          memberPaymentInfo: {},
          expenses: [],
          settlements: [],
          comments: [],
        };

        set((state) => ({ groups: [newGroup, ...state.groups] }));
      },

      addExpense: async (groupId, expense) => {
        if (!get().isOnline) {
          set((state) => ({
            pendingActions: [
              ...state.pendingActions,
              { type: "addExpense", groupId, expense },
            ],
          }));
          return;
        }

        const { data, error } = await supabase
          .from("expenses")
          .insert({
            group_id: groupId,
            title: expense.title,
            category: expense.category,
            amount: expense.amount,
            paid_by: expense.paidBy,
            participants: expense.participants,
            split_mode: expense.splitMode,
            splits: expense.splitMode !== "even" ? expense.splits : null,
            receipt_url: expense.receiptUrl ?? null,
            recurrence: expense.recurrence ?? "none",
            recurrence_parent_id: expense.recurrenceParentId ?? null,
          })
          .select()
          .single();

        if (error || !data) return;

        const newExpense: Expense = {
          id: data.id,
          title: data.title ?? "Shared expense",
          category: data.category ?? "Other",
          amount: data.amount,
          paidBy: data.paid_by,
          participants: data.participants,
          splitMode: (data.split_mode ?? "even") as SplitMode,
          splits: (data.splits ?? {}) as Record<string, number>,
          createdAt: data.created_at ?? new Date().toISOString(),
          receiptUrl: data.receipt_url ?? undefined,
          recurrence: (data.recurrence ?? "none") as Recurrence,
          recurrenceParentId: data.recurrence_parent_id ?? undefined,
        };

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...g.expenses, newExpense] }
              : g,
          ),
        }));

        // notify other group members
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const group = get().groups.find((g) => g.id === groupId);
        if (user && group) {
          supabase.functions.invoke("notify-expense", {
            body: {
              groupId,
              groupName: group.name,
              expenseTitle: newExpense.title,
              paidBy: newExpense.paidBy,
              amount: newExpense.amount,
              excludeUserId: user.id,
            },
          });
        }
      },

      markSettled: async (groupId, from, to, amount) => {
        if (!get().isOnline) {
          set((state) => ({
            pendingActions: [
              ...state.pendingActions,
              { type: "markSettled", groupId, from, to, amount },
            ],
          }));
          return;
        }

        const { data, error } = await supabase
          .from("settlements")
          .insert({ group_id: groupId, from, to, amount })
          .select()
          .single();

        if (error || !data) return;

        const newSettlement: Settlement = {
          id: data.id,
          from: data.from,
          to: data.to,
          amount: data.amount,
          createdAt: data.created_at ?? new Date().toISOString(),
        };

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, settlements: [...g.settlements, newSettlement] }
              : g,
          ),
        }));
      },

      deleteExpense: async (groupId, expenseId) => {
        if (!get().isOnline) {
          set((state) => ({
            pendingActions: [
              ...state.pendingActions,
              { type: "deleteExpense", groupId, expenseId },
            ],
          }));
          return;
        }

        const { error } = await supabase
          .from("expenses")
          .delete()
          .eq("id", expenseId);

        if (error) return;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) }
              : g,
          ),
        }));
      },

      updateExpense: async (groupId, expenseId, updates) => {
        const { error } = await supabase
          .from("expenses")
          .update({
            title: updates.title,
            category: updates.category,
            amount: updates.amount,
            paid_by: updates.paidBy,
            participants: updates.participants,
            split_mode: updates.splitMode,
            splits: updates.splitMode !== "even" ? updates.splits : null,
            receipt_url: updates.receiptUrl ?? null,
            recurrence: updates.recurrence ?? "none",
          })
          .eq("id", expenseId);

        if (error) return;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  expenses: g.expenses.map((e) =>
                    e.id === expenseId ? { ...e, ...updates } : e,
                  ),
                }
              : g,
          ),
        }));
      },

      processRecurring: async (groupId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return;

        const now = new Date();
        const recurringExpenses = group.expenses.filter(
          (e) => e.recurrence !== "none" && !e.recurrenceParentId,
        );

        for (const expense of recurringExpenses) {
          // find the most recent occurrence in this series
          const series = group.expenses.filter(
            (e) => e.recurrenceParentId === expense.id || e.id === expense.id,
          );
          const latest = series.reduce((a, b) =>
            new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
          );

          const lastDate = new Date(latest.createdAt);
          const msPerDay = 86_400_000;
          const interval =
            expense.recurrence === "weekly" ? 7 * msPerDay : 30 * msPerDay;
          const due = new Date(lastDate.getTime() + interval);

          if (now >= due) {
            await get().addExpense(groupId, {
              title: expense.title,
              category: expense.category,
              amount: expense.amount,
              paidBy: expense.paidBy,
              participants: expense.participants,
              splitMode: expense.splitMode,
              splits: expense.splits,
              recurrence: expense.recurrence,
              recurrenceParentId: expense.id,
            });
          }
        }
      },

      addComment: async (groupId, expenseId, body) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const group = get().groups.find((g) => g.id === groupId);
        const memberEntry = Object.entries(group?.memberIds ?? {}).find(
          ([, uid]) => uid === user.id,
        );
        const authorName =
          memberEntry?.[0] ?? user.email?.split("@")[0] ?? "Member";

        const { data, error } = await supabase
          .from("comments")
          .insert({
            group_id: groupId,
            expense_id: expenseId,
            user_id: user.id,
            author_name: authorName,
            body: body.trim(),
          })
          .select()
          .single();

        if (error || !data) return;

        const newComment: Comment = {
          id: data.id,
          expenseId: data.expense_id,
          groupId: data.group_id,
          userId: data.user_id,
          authorName: data.author_name,
          body: data.body,
          createdAt: data.created_at ?? new Date().toISOString(),
        };

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, comments: [...g.comments, newComment] }
              : g,
          ),
        }));
      },

      renameGroup: async (groupId, name) => {
        const { error } = await supabase
          .from("groups")
          .update({ name })
          .eq("id", groupId);

        if (error) return;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, name } : g,
          ),
        }));
      },

      setBudget: async (groupId, budget) => {
        const { error } = await supabase
          .from("groups")
          .update({ budget })
          .eq("id", groupId);

        if (error) return;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, budget: budget ?? undefined } : g,
          ),
        }));
      },

      removeGroupMember: async (groupId, memberUserId, memberName) => {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", memberUserId);

        if (error) return;

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.filter((m) => m !== memberName) }
              : g,
          ),
        }));
      },

      leaveGroup: async (groupId) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user.id);

        set((state) => ({
          groups: state.groups.filter((g) => g.id !== groupId),
        }));
      },

      deleteGroup: async (groupId) => {
        const { error } = await supabase
          .from("groups")
          .delete()
          .eq("id", groupId);

        if (error) return;

        set((state) => ({
          groups: state.groups.filter((g) => g.id !== groupId),
        }));
      },

      subscribeToGroup: (groupId) => {
        const channel = supabase.channel(`group-${groupId}`);

        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "expenses",
            filter: `group_id=eq.${groupId}`,
          },
          () => get().fetchGroups(),
        );

        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "settlements",
            filter: `group_id=eq.${groupId}`,
          },
          () => get().fetchGroups(),
        );

        channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "comments",
            filter: `group_id=eq.${groupId}`,
          },
          () => get().fetchGroups(),
        );

        channel.subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },

      joinGroup: async (inviteCode) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: "Not signed in" };

        const { data: group, error: findError } = await supabase
          .from("groups")
          .select("*")
          .eq("invite_code", inviteCode.toUpperCase().trim())
          .single();

        if (findError || !group) {
          return {
            error: "Invalid invite code. Check the code and try again.",
          };
        }

        const { data: existing } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", group.id)
          .eq("user_id", user.id)
          .single();

        if (existing) {
          return { error: "You are already a member of this group." };
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const memberName =
          profile?.full_name?.trim() || user.email?.split("@")[0] || "Member";

        const { error: joinError } = await supabase
          .from("group_members")
          .insert({ group_id: group.id, name: memberName, user_id: user.id });

        if (joinError) {
          return { error: "Failed to join group. Try again." };
        }

        await get().fetchGroups();
        return { error: null };
      },
    }),
    {
      name: "debt-sync-storage",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
