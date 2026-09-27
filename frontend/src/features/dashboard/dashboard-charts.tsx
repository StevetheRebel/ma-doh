"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { confirmedTransactions, formatKes } from "@/lib/finance";
import type { Transaction } from "@/types/transaction";

import styles from "./dashboard-charts.module.css";

const chartColors = ["#167818", "#404084", "#eb5128", "#ffce50", "#5adf9f", "#a5bcd6"];

type DashboardChartsProps = {
  transactions: Transaction[];
  hideAmounts: boolean;
};

type TooltipValue = number | string | readonly (number | string)[] | undefined;

function formatAxisValue(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

function DashboardTooltip({ active, payload, label, hideAmounts }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: TooltipValue; color?: string }>;
  label?: string;
  hideAmounts: boolean;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      {label ? <strong>{label}</strong> : null}
      {payload.map((item) => (
        <span key={item.name}>
          <i style={{ background: item.color }} />
          {item.name}: {hideAmounts ? "KES ••••••" : formatKes(Number(item.value ?? 0))}
        </span>
      ))}
    </div>
  );
}

function buildPeriodData(transactions: Transaction[]) {
  const grouped = new Map<string, { label: string; income: number; expenses: number; sort: string }>();

  for (const transaction of confirmedTransactions(transactions)) {
    const date = new Date(transaction.transactionDate);
    const sort = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = grouped.get(sort) ?? {
      label: date.toLocaleDateString("en-KE", { month: "short" }),
      income: 0,
      expenses: 0,
      sort,
    };

    if (transaction.type === "income") current.income += transaction.amount;
    if (transaction.type === "expense") current.expenses += transaction.amount;
    if (transaction.type === "refund") current.expenses = Math.max(0, current.expenses - transaction.amount);
    grouped.set(sort, current);
  }

  return [...grouped.values()].sort((a, b) => a.sort.localeCompare(b.sort));
}

function buildCategoryData(transactions: Transaction[]) {
  const grouped = new Map<string, number>();
  for (const transaction of confirmedTransactions(transactions)) {
    if (transaction.type !== "expense") continue;
    grouped.set(transaction.category, (grouped.get(transaction.category) ?? 0) + transaction.amount);
  }
  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildCashFlowData(transactions: Transaction[]) {
  let balance = 0;
  return confirmedTransactions(transactions)
    .toSorted((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime())
    .map((transaction) => {
      if (transaction.type === "income" || transaction.type === "refund") balance += transaction.amount;
      if (transaction.type === "expense") balance -= transaction.amount;
      return {
        label: new Date(transaction.transactionDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
        balance,
      };
    });
}

export function DashboardCharts({ transactions, hideAmounts }: DashboardChartsProps) {
  const periodData = useMemo(() => buildPeriodData(transactions), [transactions]);
  const categoryData = useMemo(() => buildCategoryData(transactions), [transactions]);
  const cashFlowData = useMemo(() => buildCashFlowData(transactions), [transactions]);
  const totalExpenses = categoryData.reduce((total, item) => total + item.value, 0);

  if (!transactions.length) {
    return <div className={styles.empty}>Add a confirmed transaction to unlock your financial charts.</div>;
  }

  return (
    <section className={styles.chartGrid} aria-label="Financial charts">
      <article className={`${styles.chartPanel} ${styles.wide}`}>
        <header>
          <div><p>Cash movement</p><h2>Income vs expenses</h2></div>
          <div className={styles.legend}><span><i className={styles.incomeDot} />Income</span><span><i className={styles.expenseDot} />Expenses</span></div>
        </header>
        <div className={styles.chartFrame} role="img" aria-label="Bar chart comparing income and expenses">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodData} margin={{ top: 14, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e5ebe7" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#66716b", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={hideAmounts ? () => "••" : formatAxisValue} tick={{ fill: "#66716b", fontSize: 11 }} />
              <Tooltip content={<DashboardTooltip hideAmounts={hideAmounts} />} cursor={{ fill: "#f3f7f4" }} />
              <Bar dataKey="income" name="Income" fill="#53af32" radius={[4, 4, 0, 0]} maxBarSize={34} />
              <Bar dataKey="expenses" name="Expenses" fill="#404084" radius={[4, 4, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.chartPanel}>
        <header><div><p>Expense mix</p><h2>Spending by category</h2></div></header>
        <div className={styles.donutWrap}>
          <div className={styles.chartFrame} role="img" aria-label="Donut chart of spending categories">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
                  {categoryData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip content={<DashboardTooltip hideAmounts={hideAmounts} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutTotal}><span>Total</span><strong>{hideAmounts ? "••••" : formatAxisValue(totalExpenses)}</strong></div>
          </div>
          <div className={styles.categoryLegend}>
            {categoryData.slice(0, 4).map((item, index) => (
              <span key={item.name}><i style={{ background: chartColors[index % chartColors.length] }} />{item.name}</span>
            ))}
          </div>
        </div>
      </article>

      <article className={`${styles.chartPanel} ${styles.wide}`}>
        <header><div><p>Running balance</p><h2>Cash flow</h2></div></header>
        <div className={styles.chartFrame} role="img" aria-label="Area chart of running cash flow">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowData} margin={{ top: 14, right: 8, left: -14, bottom: 0 }}>
              <defs><linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5adf9f" stopOpacity={0.38} /><stop offset="100%" stopColor="#5adf9f" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#e5ebe7" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#66716b", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={hideAmounts ? () => "••" : formatAxisValue} tick={{ fill: "#66716b", fontSize: 11 }} />
              <Tooltip content={<DashboardTooltip hideAmounts={hideAmounts} />} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="#167818" strokeWidth={2.5} fill="url(#cashFlowFill)" activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className={styles.chartPanel}>
        <header><div><p>Ranked by total</p><h2>Top spending categories</h2></div></header>
        <div className={styles.ranking}>
          {categoryData.slice(0, 5).map((item, index) => (
            <div className={styles.rankRow} key={item.name}>
              <div><span>{item.name}</span><strong>{hideAmounts ? "KES ••••••" : formatKes(item.value)}</strong></div>
              <div className={styles.track}><span style={{ width: `${totalExpenses ? (item.value / categoryData[0].value) * 100 : 0}%`, background: chartColors[index % chartColors.length] }} /></div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
