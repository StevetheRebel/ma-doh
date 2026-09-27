"use client";

import { ArrowUpRight, CalendarRange, PiggyBank, ReceiptText, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { appPeriods, useAppPreferences } from "@/components/layout/app-preferences";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { calculateSummary, categoryTotals, confirmedTransactions, formatKes } from "@/lib/finance";
import type { Transaction } from "@/types/transaction";

import styles from "./insights-view.module.css";

const categoryColors = ["#167818", "#404084", "#53af32", "#eb5128", "#3f2354", "#ffce50"];

function compactAmount(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function InsightTooltip({ active, payload, label, hideAmounts }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
  hideAmounts: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {label ? <strong>{label}</strong> : null}
      {payload.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {hideAmounts ? "KES ••••••" : formatKes(Number(item.value ?? 0))}</span>)}
    </div>
  );
}

function sixMonthTrend(transactions: Transaction[], anchorPeriod: string) {
  const confirmed = confirmedTransactions(transactions);
  const latestDate = confirmed.reduce<Date | null>((latest, transaction) => {
    const date = new Date(transaction.transactionDate);
    return !latest || date > latest ? date : latest;
  }, null);
  const anchor = anchorPeriod === "all" ? latestDate ?? new Date() : new Date(`${anchorPeriod}-01T12:00:00+03:00`);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthly = confirmed.filter((transaction) => transaction.transactionDate.startsWith(key));
    return {
      label: date.toLocaleDateString("en-KE", { month: "short" }),
      income: monthly.reduce((total, transaction) => transaction.type === "income" ? total + transaction.amount : total, 0),
      expenses: monthly.reduce((total, transaction) => transaction.type === "expense" ? total + transaction.amount : total, 0),
    };
  });
}

function weeklySpending(transactions: Transaction[]) {
  const weeks = [0, 0, 0, 0];
  for (const transaction of confirmedTransactions(transactions)) {
    if (transaction.type !== "expense") continue;
    const week = Math.min(3, Math.floor((new Date(transaction.transactionDate).getDate() - 1) / 7));
    weeks[week] += transaction.amount;
  }
  return weeks.map((spending, index) => ({ label: `W${index + 1}`, spending }));
}

function buildFindings(transactions: Transaction[], expenses: number) {
  const confirmed = confirmedTransactions(transactions);
  const expenseRecords = confirmed.filter((transaction) => transaction.type === "expense");
  const totals = Object.entries(categoryTotals(confirmed)).sort((a, b) => b[1] - a[1]);
  const recurring = confirmed.filter((transaction) => transaction.recurring);
  const methods = expenseRecords.reduce<Record<string, number>>((result, transaction) => {
    const method = transaction.paymentMethod ?? "Other";
    result[method] = (result[method] ?? 0) + 1;
    return result;
  }, {});
  const leadingMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
  const largest = totals[0];

  return [
    {
      icon: TrendingDown,
      title: largest ? `${largest[0]} leads your spending.` : "No expense pattern yet.",
      detail: largest ? `${formatKes(largest[1])} accounts for ${expenses ? Math.round((largest[1] / expenses) * 100) : 0}% of recorded expenses.` : "Add confirmed expenses to reveal your leading category.",
      basis: `Based on ${expenseRecords.length} confirmed expense records`,
    },
    {
      icon: ReceiptText,
      title: expenseRecords.length ? `Your average expense is ${formatKes(expenses / expenseRecords.length)}.` : "Average expense is not available yet.",
      detail: expenseRecords.length ? `Across ${expenseRecords.length} recorded purchases and payments in this period.` : "Confirmed expenses are needed for this calculation.",
      basis: "Calculated from confirmed expense amounts",
    },
    {
      icon: CalendarRange,
      title: `${recurring.length} recurring ${recurring.length === 1 ? "commitment" : "commitments"} detected.`,
      detail: recurring.length ? `They represent ${formatKes(recurring.reduce((total, transaction) => total + transaction.amount, 0))} in tracked activity.` : "Mark regular payments to monitor predictable cash flow.",
      basis: "Based on records marked as recurring",
    },
    {
      icon: PiggyBank,
      title: leadingMethod ? `${leadingMethod[0]} is your most-used payment method.` : "Payment preference is not available yet.",
      detail: leadingMethod ? `${leadingMethod[1]} of ${expenseRecords.length} expense records used ${leadingMethod[0]}.` : "Add a payment method when confirming expenses.",
      basis: "Based on confirmed payment methods",
    },
  ];
}

export function InsightsView() {
  const { transactions } = useTransactions();
  const { period, hideAmounts } = useAppPreferences();
  const filtered = useMemo(() => period === "all" ? transactions : transactions.filter((transaction) => transaction.transactionDate.startsWith(period)), [period, transactions]);
  const summary = useMemo(() => calculateSummary(filtered), [filtered]);
  const trend = useMemo(() => sixMonthTrend(transactions, period), [period, transactions]);
  const weekly = useMemo(() => weeklySpending(filtered), [filtered]);
  const categories = useMemo(() => Object.entries(categoryTotals(filtered)).sort((a, b) => b[1] - a[1]), [filtered]);
  const findings = useMemo(() => buildFindings(filtered, summary.expenses), [filtered, summary.expenses]);
  const periodLabel = appPeriods.find((item) => item.value === period)?.label ?? "selected period";
  const savings = Math.max(0, summary.netCashFlow);
  const savingsRate = summary.income ? Math.round((savings / summary.income) * 100) : 0;
  const money = (value: number) => hideAmounts ? "KES ••••••" : formatKes(value);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}><h1>Insights</h1><p>What your confirmed records say about {periodLabel}</p></header>

      <section className={styles.summaryGrid} aria-label="Insight summary">
        <article><span>Total income</span><strong className={styles.positive}>{money(summary.income)}</strong></article>
        <article><span>Total expenses</span><strong>{money(summary.expenses)}</strong></article>
        <article><span>Savings</span><strong className={styles.positive}>{money(savings)}</strong></article>
        <article><span>Saving rate</span><strong className={styles.positive}>{savingsRate}%</strong><small>of income kept</small></article>
      </section>

      <section className={styles.chartGrid} aria-label="Insight charts">
        <article className={styles.chartCard}>
          <div className={styles.cardHeading}><div><h2>Income vs expenses</h2><p>Six-month trend</p></div><div className={styles.legend}><span><i className={styles.incomeDot} />Income</span><span><i className={styles.expenseDot} />Expenses</span></div></div>
          <div className={styles.chartFrame} role="img" aria-label="Six-month income and expense chart">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{ top: 15, right: 6, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e4eae6" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#68736c" }} /><YAxis axisLine={false} tickLine={false} tickFormatter={hideAmounts ? () => "••" : compactAmount} tick={{ fontSize: 11, fill: "#68736c" }} /><Tooltip content={<InsightTooltip hideAmounts={hideAmounts} />} cursor={{ fill: "#f3f7f4" }} /><Bar dataKey="income" name="Income" fill="#a5e1c2" radius={[3, 3, 0, 0]} maxBarSize={18} /><Bar dataKey="expenses" name="Expenses" fill="#404084" radius={[3, 3, 0, 0]} maxBarSize={18} /></BarChart></ResponsiveContainer>
          </div>
        </article>

        <article className={styles.chartCard}>
          <div className={styles.cardHeading}><div><h2>Category breakdown</h2><p>Where the money went</p></div></div>
          <div className={styles.categoryList}>
            {categories.length ? categories.slice(0, 6).map(([category, value], index) => <div key={category}><div><span>{category}</span><strong>{money(value)}</strong></div><div className={styles.categoryTrack}><span style={{ width: `${(value / categories[0][1]) * 100}%`, background: categoryColors[index % categoryColors.length] }} /></div></div>) : <p className={styles.empty}>No confirmed expenses in this period.</p>}
          </div>
        </article>

        <article className={`${styles.chartCard} ${styles.weeklyCard}`}>
          <div className={styles.cardHeading}><div><h2>Week-by-week comparison</h2><p>{periodLabel}</p></div></div>
          <div className={styles.weekChart} role="img" aria-label="Weekly spending trend">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={weekly} margin={{ top: 15, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="insightWeeklyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5adf9f" stopOpacity={0.32} /><stop offset="100%" stopColor="#5adf9f" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e4eae6" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#68736c" }} /><YAxis axisLine={false} tickLine={false} tickFormatter={hideAmounts ? () => "••" : compactAmount} tick={{ fontSize: 11, fill: "#68736c" }} /><Tooltip content={<InsightTooltip hideAmounts={hideAmounts} />} /><Area type="monotone" dataKey="spending" name="Spending" stroke="#15945a" strokeWidth={2.5} fill="url(#insightWeeklyFill)" activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className={styles.findingsSection}>
        <div className={styles.findingsHeading}><h2>What Ma-Doh found</h2><span>{summary.transactionCount} confirmed records analysed</span></div>
        <div className={styles.findingsGrid}>
          {findings.map(({ icon: Icon, title, detail, basis }) => <article className={styles.findingCard} key={title}><Icon size={21} aria-hidden="true" /><h3>{hideAmounts ? title.replace(/KES\s?[\d,.]+/g, "KES ••••••") : title}</h3><p>{hideAmounts ? detail.replace(/KES\s?[\d,.]+/g, "KES ••••••") : detail}</p><footer><span>{basis}</span><Link href="/transactions">View data <ArrowUpRight size={14} /></Link></footer></article>)}
        </div>
      </section>
    </div>
  );
}
