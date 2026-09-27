"use client";

import { demoTransactions } from "@/data/demo-transactions";
import { transactionDraftSchema, type Transaction } from "@/types/transaction";

const storageKey = "ma-doh.demo.transactions.v1";
const pendingDraftKey = "ma-doh.pending-transaction.v1";
const serverSnapshot = demoTransactions;
let transactions = demoTransactions;
let hydrated = false;
const listeners = new Set<() => void>();
let pendingDraft: Transaction | null = null;
let pendingDraftHydrated = false;
const pendingDraftListeners = new Set<() => void>();

function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return;
  }

  try {
    const result = transactionDraftSchema.array().safeParse(JSON.parse(stored));
    if (result.success) {
      transactions = result.data;
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function emit() {
  window.localStorage.setItem(storageKey, JSON.stringify(transactions));
  listeners.forEach((listener) => listener());
}

export function subscribeToTransactions(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTransactionsSnapshot() {
  hydrateFromStorage();
  return transactions;
}

export function getTransactionsServerSnapshot() {
  return serverSnapshot;
}

export function addConfirmedTransaction(transaction: Transaction) {
  hydrateFromStorage();
  transactions = [
    {
      ...transaction,
      verificationStatus: "confirmed",
    },
    ...transactions,
  ];
  emit();
}

export function resetDemoTransactions() {
  transactions = demoTransactions;
  emit();
}

function hydratePendingDraft() {
  if (pendingDraftHydrated || typeof window === "undefined") {
    return;
  }

  pendingDraftHydrated = true;
  const stored = window.sessionStorage.getItem(pendingDraftKey);
  if (!stored) {
    return;
  }

  try {
    const result = transactionDraftSchema.safeParse(JSON.parse(stored));
    if (result.success) {
      pendingDraft = result.data;
    } else {
      window.sessionStorage.removeItem(pendingDraftKey);
    }
  } catch {
    window.sessionStorage.removeItem(pendingDraftKey);
  }
}

export function subscribeToPendingDraft(listener: () => void) {
  pendingDraftListeners.add(listener);
  return () => {
    pendingDraftListeners.delete(listener);
  };
}

export function getPendingDraftSnapshot() {
  hydratePendingDraft();
  return pendingDraft;
}

export function getPendingDraftServerSnapshot() {
  return null;
}

export function setPendingDraftSnapshot(transaction: Transaction | null) {
  pendingDraft = transaction;
  if (transaction) {
    window.sessionStorage.setItem(pendingDraftKey, JSON.stringify(transaction));
  } else {
    window.sessionStorage.removeItem(pendingDraftKey);
  }
  pendingDraftListeners.forEach((listener) => listener());
}
