import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Expense, Settlement, SplitMode } from "../lib/settlement";
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

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
  expenses: Expense[];
  settlements: Settlement[];
}

interface Store {
  groups: Group[];
  isSyncing: boolean;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  addExpense: (groupId: string, expense: Omit<Expense, "id">) => Promise<void>;
  markSettled: (groupId: string, from: string, to: string, amount: number, paymentRef?: string) => Promise<void>;
  subscribeToGroup: (groupId: string) => () => void;
  joinGroup: (inviteCode: string) => Promise<{ error: string | null }>;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      groups: [],
      isSyncing: false,

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
            ] = await Promise.all([
              supabase
                .from("group_members")
                .select("name")
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
            ]);

            return {
              id: g.id,
              name: g.name,
              inviteCode: g.invite_code,
              members: members?.map((m) => m.name) ?? [],
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

        const creatorName = user.email?.split("@")[0] ?? "You";

        await supabase.from("group_members").insert({
          group_id: group.id,
          name: creatorName,
          user_id: user.id,
        });

        const newGroup: Group = {
          id: group.id,
          name: group.name,
          inviteCode: group.invite_code,
          members: [creatorName],
          expenses: [],
          settlements: [],
        };

        set((state) => ({ groups: [newGroup, ...state.groups] }));
      },

      addExpense: async (groupId, expense) => {
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
        };

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...g.expenses, newExpense] }
              : g,
          ),
        }));
      },

      markSettled: async (groupId, from, to, amount, paymentRef) => {
        const { data, error } = await supabase
          .from("settlements")
          .insert({
            group_id: groupId,
            from,
            to,
            amount,
            payment_ref: paymentRef ?? null,
            payment_method: paymentRef ? "paystack" : "manual",
          })
          .select()
          .single();

        if (error || !data) return;

        const newSettlement: Settlement = {
          id: data.id,
          from: data.from,
          to: data.to,
          amount: data.amount,
          paymentRef: data.payment_ref ?? undefined,
          paymentMethod: data.payment_method ?? "manual",
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

        const memberName = user.email?.split("@")[0] ?? "Member";

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
