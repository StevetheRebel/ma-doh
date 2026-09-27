import type { Transaction, TransactionCategory } from "@/types/transaction";

export type FinancialSummary = {
  income: number;
  expenses: number;
  netCashFlow: number;
  transactionCount: number;
  largestCategory: TransactionCategory | null;
  largestCategoryTotal: number;
};

export function confirmedTransactions(transactions: Transaction[]) {
  return transactions.filter(
    (transaction) => transaction.verificationStatus === "confirmed",
  );
}

export function categoryTotals(transactions: Transaction[]) {
  return confirmedTransactions(transactions).reduce<
    Partial<Record<TransactionCategory, number>>
  >((totals, transaction) => {
    if (transaction.type !== "expense") {
      return totals;
    }

    totals[transaction.category] =
      (totals[transaction.category] ?? 0) + transaction.amount;
    return totals;
  }, {});
}

export function calculateSummary(transactions: Transaction[]): FinancialSummary {
  const confirmed = confirmedTransactions(transactions);
  const income = confirmed.reduce(
    (total, transaction) =>
      transaction.type === "income" ? total + transaction.amount : total,
    0,
  );
  const grossExpenses = confirmed.reduce(
    (total, transaction) =>
      transaction.type === "expense" ? total + transaction.amount : total,
    0,
  );
  const refunds = confirmed.reduce(
    (total, transaction) =>
      transaction.type === "refund" ? total + transaction.amount : total,
    0,
  );
  const expenses = Math.max(0, grossExpenses - refunds);
  const totals = categoryTotals(confirmed);
  const [largestCategory, largestCategoryTotal] = Object.entries(totals).reduce<
    [TransactionCategory | null, number]
  >(
    (largest, [category, total]) =>
      total > largest[1]
        ? [category as TransactionCategory, total]
        : largest,
    [null, 0],
  );

  return {
    income,
    expenses,
    netCashFlow: income - expenses,
    transactionCount: confirmed.length,
    largestCategory,
    largestCategoryTotal,
  };
}

export function formatKes(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("Ksh", "KES");
}
