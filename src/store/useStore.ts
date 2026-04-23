import { randomUUID } from "expo-crypto";
import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Expense, Settlement } from "../lib/settlement";

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
  members: string[];
  expenses: Expense[];
  settlements: Settlement[];
}

interface Store {
  groups: Group[];
  createGroup: (name: string, members: string[]) => void;
  addExpense: (groupId: string, expense: Omit<Expense, "id">) => void;
  markSettled: (
    groupId: string,
    from: string,
    to: string,
    amount: number,
  ) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      groups: [],
      createGroup: (name, members) =>
        set((state) => ({
          groups: [
            ...state.groups,
            {
              id: randomUUID(),
              name,
              members,
              expenses: [],
              settlements: [],
            },
          ],
        })),

      addExpense: (groupId, expense) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  expenses: [...g.expenses, { ...expense, id: randomUUID() }],
                }
              : g,
          ),
        })),

      markSettled: (groupId, from, to, amount) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  settlements: [
                    ...g.settlements,
                    { id: randomUUID(), from, to, amount },
                  ],
                }
              : g,
          ),
        })),
    }),
    {
      name: "debt-sync-storage",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
