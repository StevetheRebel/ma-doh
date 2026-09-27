"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { formatKes } from "@/lib/finance";

import styles from "./transaction-pages.module.css";

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { transactions } = useTransactions();
  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) {
    return (
      <div className={styles.narrowPage}>
        <PageHeader eyebrow="Transaction" title="Record not found" />
        <section className={styles.emptyState}>
          <div>
            <p>This transaction is not available in the current demo record.</p>
            <Link className={styles.primaryAction} href="/transactions">Return to transactions</Link>
          </div>
        </section>
      </div>
    );
  }

  const saved = searchParams.get("saved") === "true";
  const details = [
    ["Type", transaction.type],
    ["Category", transaction.category],
    ["Payment method", transaction.paymentMethod ?? "Not supplied"],
    ["Date", new Date(transaction.transactionDate).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })],
    ["Source", transaction.source],
    ["Reference", transaction.reference ?? "Not supplied"],
    ["Recurring", transaction.recurring ? "Yes" : "No"],
    ["Notes", transaction.description || "None"],
  ];

  return (
    <div className={styles.narrowPage}>
      <PageHeader eyebrow="Confirmed transaction" title="Transaction details" />
      {saved ? (
        <div className={styles.reviewNotice} role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div><strong>Transaction saved</strong><p>Your dashboard has been recalculated.</p></div>
        </div>
      ) : null}
      <article className={styles.detailCard}>
        <header className={styles.detailHeader}>
          <div>
            <span className={styles.typeBadge}>{transaction.type}</span>
            <h2>{transaction.merchant}</h2>
            <p>{transaction.category}</p>
          </div>
          <strong>{transaction.type === "income" ? "+ " : transaction.type === "transfer" ? "" : "- "}{formatKes(transaction.amount)}</strong>
        </header>
        <dl className={styles.detailList}>
          {details.map(([label, value]) => (
            <div className={styles.detailRow} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.formActions}>
          <Link className={styles.secondaryAction} href="/transactions">
            <ArrowLeft size={17} aria-hidden="true" />
            All transactions
          </Link>
          <Link className={styles.primaryAction} href="/dashboard">View dashboard</Link>
        </div>
      </article>
    </div>
  );
}
