import { demoTransactions } from "@/data/demo-transactions";
import {
  calculateCategoryTotals,
  calculateNetCashFlow,
  calculateTotalExpenses,
  calculateTotalIncome,
} from "@/lib/calculations/financial";

export default function TestFinancePage() {
  const totalIncome = calculateTotalIncome(demoTransactions);
  const totalExpenses = calculateTotalExpenses(demoTransactions);
  const netCashFlow = calculateNetCashFlow(demoTransactions);
  const categoryTotals = calculateCategoryTotals(demoTransactions);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Financial Calculation Test</h1>

      <p>Total income: KES {totalIncome}</p>
      <p>Total expenses: KES {totalExpenses}</p>
      <p>Net cash flow: KES {netCashFlow}</p>

      <h2>Category totals</h2>

      <pre>{JSON.stringify(categoryTotals, null, 2)}</pre>
    </main>
  );
}