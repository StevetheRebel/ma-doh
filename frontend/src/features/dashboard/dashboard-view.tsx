"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  ReceiptText,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useAppPreferences } from "@/components/layout/app-preferences";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { formatKes } from "@/lib/finance";

import { useSummary } from "@/lib/use-summary";
import { categoryLabels } from "@/types/api";

import { DashboardCharts } from "./dashboard-charts";
import styles from "./dashboard-view.module.css";

export function DashboardView() {
  const { transactions, balances, drafts } = useTransactions();
  const { period, hideAmounts } = useAppPreferences();
  const filteredTransactions = useMemo(
    () =>
      period === "all"
        ? transactions
        : transactions.filter((transaction) =>
            transaction.transactionDate.startsWith(period),
          ),
    [period, transactions],
  );
  const { data: summary, error } = useSummary(period);
  const recent = useMemo(
    () =>
      [...filteredTransactions]
        .filter((transaction) => transaction.verificationStatus === "confirmed")
        .sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() -
            new Date(a.transactionDate).getTime(),
        )
        .slice(0, 3),
    [filteredTransactions],
  );
  const money = (amount: number | string) =>
    hideAmounts ? "KES ••••••" : formatKes(amount);

  if (!summary) return <p role="status">{error || "Loading summary…"}</p>;
  const largest = summary.categories[0];
  return (
    <>
      <p>
        <Link href="/transactions/review">
          {drafts.length} drafts awaiting review
        </Link>{" "}
        · <Link href="/settings">Manage accounts</Link>
      </p>
      <section className={styles.summaryGrid} aria-label="Financial summary">
        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            <CircleDollarSign size={18} aria-hidden="true" />
            Estimated cash balance
          </div>
          <strong>{money(balances.total_estimated_cash)}</strong>
          <span>Opening balances + records, as of {balances.as_of}</span>
        </article>
        <article className={styles.summaryCard}>
          <div className={`${styles.summaryLabel} ${styles.incomeLabel}`}>
            <ArrowDownLeft size={18} aria-hidden="true" />
            Income
          </div>
          <strong className={styles.positive}>{money(summary.income)}</strong>
          <span>{period === "all" ? "All records" : "Selected month"}</span>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            <ArrowUpRight size={18} aria-hidden="true" />
            Expenses
          </div>
          <strong>{money(summary.expenses)}</strong>
          <span>{period === "all" ? "All records" : "Selected month"}</span>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            <WalletCards size={18} aria-hidden="true" />
            Net cash flow
          </div>
          <strong>{money(summary.net_cash_flow)}</strong>
          <span>{summary.transaction_count} confirmed records</span>
        </article>
      </section>

      <DashboardCharts
        transactions={filteredTransactions}
        hideAmounts={hideAmounts}
      />

      <section className={styles.workspaceGrid}>
        <div className={styles.workspaceMain}>
          <section>
            <div className={styles.sectionHeading}>
              <div>
                <p>Latest activity</p>
                <h2>Recent transactions</h2>
              </div>
              <Link href="/transactions">View all</Link>
            </div>

            <div className={styles.transactionList}>
              {recent.length ? (
                recent.map((transaction) => (
                  <Link
                    className={styles.transactionRow}
                    href={`/transactions/${transaction.id}`}
                    key={transaction.id}
                  >
                    <span className={styles.transactionIcon}>
                      <ReceiptText size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{transaction.merchant}</strong>
                      <span>
                        {transaction.category} ·{" "}
                        {new Date(
                          transaction.transactionDate,
                        ).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <strong
                      className={
                        transaction.type === "income" ? styles.positive : ""
                      }
                    >
                      {transaction.type === "income"
                        ? "+ "
                        : transaction.type === "transfer"
                          ? ""
                          : "- "}
                      {money(transaction.amountExact ?? transaction.amount)}
                    </strong>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyPeriod}>
                  No confirmed transactions in this period.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.insightPanel}>
          <div className="flex gap-4 ">
            <div className={`${styles.insightIcon}`}>
              <Sparkles size={21} aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <p>Ask My Money</p>
              <h2>Where is most of my money going?</h2>
            </div>
          </div>
          <div className={styles.insightAnswer}>
            <span>Largest category</span>
            <strong>
              {largest ? categoryLabels[largest.category] : "No expenses yet"}
            </strong>
            <p>
              {largest
                ? `${money(largest.amount)} in confirmed expenses.`
                : "Add an expense to see your leading category."}
            </p>
          </div>
          <Link className={styles.secondaryAction} href="/ask">
            <CircleDollarSign size={18} aria-hidden="true" />
            Ask another question
          </Link>
        </aside>
      </section>
    </>
  );
}
