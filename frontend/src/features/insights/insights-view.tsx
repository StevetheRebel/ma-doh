"use client";
import { useAppPreferences } from "@/components/layout/app-preferences";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { useSummary } from "@/lib/use-summary";
import { formatKes } from "@/lib/finance";
import { categoryLabels } from "@/types/api";
import { DashboardCharts } from "@/features/dashboard/dashboard-charts";
import styles from "./insights-view.module.css";
export function InsightsView() {
  const { period, hideAmounts } = useAppPreferences();
  const { transactions } = useTransactions();
  const { data, error } = useSummary(period);
  if (!data) return <p>{error || "Loading insights…"}</p>;
  const money = (s: string) => (hideAmounts ? "KES ••••••" : formatKes(s));
  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Insights</h1>
        <p>
          {data.start_date} to {data.end_date}. {data.basis}
        </p>
      </header>
      <section className={styles.summaryGrid}>
        <article>
          <span>Income</span>
          <strong>{money(data.income)}</strong>
        </article>
        <article>
          <span>Expenses</span>
          <strong>{money(data.expenses)}</strong>
        </article>
        <article>
          <span>Net cash flow</span>
          <strong>{money(data.net_cash_flow)}</strong>
        </article>
        <article>
          <span>Confirmed records</span>
          <strong>{data.transaction_count}</strong>
        </article>
      </section>
      <DashboardCharts
        transactions={transactions.filter(
          (t) =>
            t.transactionDate.slice(0, 10) >= data.start_date &&
            t.transactionDate.slice(0, 10) <= data.end_date,
        )}
        hideAmounts={hideAmounts}
      />
      <section className={styles.chartCard}>
        <h2>Spending categories</h2>
        {data.categories.map((c) => (
          <p key={c.category}>
            {categoryLabels[c.category]}: {money(c.amount)} ·{" "}
            {hideAmounts ? "••" : c.share_percent}% · {c.count} records
          </p>
        ))}
        {!data.categories.length && <p>No expenses recorded in this period.</p>}
      </section>
    </div>
  );
}
