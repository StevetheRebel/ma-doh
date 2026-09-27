import type { Transaction } from "@/types/transaction";

export function calculateTotalIncome(
  transactions: Transaction[]
): number {
  return transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function calculateTotalExpenses(
  transactions: Transaction[]
): number {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function calculateNetCashFlow(
  transactions: Transaction[]
): number {
  return (
    calculateTotalIncome(transactions) -
    calculateTotalExpenses(transactions)
  );
}

export function calculateCategoryTotals(
  transactions: Transaction[]
): Record<string, number> {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, number>>((totals, transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] ?? 0) + transaction.amount;

      return totals;
    }, {});
}