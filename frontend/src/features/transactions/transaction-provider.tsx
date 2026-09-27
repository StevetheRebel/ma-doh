"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  addConfirmedTransaction,
  getPendingDraftServerSnapshot,
  getPendingDraftSnapshot,
  getTransactionsServerSnapshot,
  getTransactionsSnapshot,
  resetDemoTransactions,
  setPendingDraftSnapshot,
  subscribeToPendingDraft,
  subscribeToTransactions,
} from "@/lib/transaction-store";
import type { Transaction } from "@/types/transaction";

type TransactionContextValue = {
  transactions: Transaction[];
  pendingDraft: Transaction | null;
  setPendingDraft: (transaction: Transaction | null) => void;
  confirmTransaction: (transaction: Transaction) => Transaction;
  resetDemo: () => void;
};

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const transactions = useSyncExternalStore(
    subscribeToTransactions,
    getTransactionsSnapshot,
    getTransactionsServerSnapshot,
  );
  const pendingDraft = useSyncExternalStore(
    subscribeToPendingDraft,
    getPendingDraftSnapshot,
    getPendingDraftServerSnapshot,
  );

  const updatePendingDraft = useCallback((transaction: Transaction | null) => {
    setPendingDraftSnapshot(transaction);
  }, []);

  const value = useMemo<TransactionContextValue>(
    () => ({
      transactions,
      pendingDraft,
      setPendingDraft: updatePendingDraft,
      confirmTransaction: (transaction) => {
        const confirmed: Transaction = {
          ...transaction,
          verificationStatus: "confirmed",
        };
        addConfirmedTransaction(confirmed);
        return confirmed;
      },
      resetDemo: resetDemoTransactions,
    }),
    [pendingDraft, transactions, updatePendingDraft],
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within TransactionProvider");
  }
  return context;
}
