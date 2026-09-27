"use client";

import { ArrowDownLeft, ArrowUpRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { formatKes } from "@/lib/finance";

import styles from "./transaction-pages.module.css";

export function TransactionList() {
  const { transactions } = useTransactions();
  const [query, setQuery] = useState("");
  const visibleTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...transactions]
      .filter((transaction) => transaction.verificationStatus === "confirmed")
      .filter((transaction) =>
        normalized
          ? [
              transaction.merchant,
              transaction.category,
              transaction.description,
            ]
              .filter(Boolean)
              .some((value) => value?.toLowerCase().includes(normalized))
          : true,
      )
      .sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );
  }, [query, transactions]);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={`${visibleTransactions.length} confirmed records`}
        title="Transactions"
        action={
          <Link className={styles.primaryAction} href="/transactions/add">
            <Plus size={18} aria-hidden="true" />
            Add transaction
          </Link>
        }
      />

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search transactions</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search merchant or category"
          />
        </label>
      </div>

      {visibleTransactions.length ? (
        <div className={styles.transactionList}>
          {visibleTransactions.map((transaction) => {
            const incoming =
              transaction.type === "income" || transaction.type === "refund";
            const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
            return (
              <Link
                className={styles.transactionRow}
                href={`/transactions/${transaction.id}`}
                key={transaction.id}
              >
                <span className={styles.transactionIcon}>
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className={styles.transactionMeta}>
                  <strong>{transaction.merchant}</strong>
                  <span>
                    {transaction.category} · {transaction.paymentMethod}
                  </span>
                </div>
                <div className={styles.transactionAmount}>
                  <strong className={incoming ? styles.positive : ""}>
                    {incoming
                      ? "+ "
                      : transaction.type === "transfer"
                        ? ""
                        : "- "}
                    {formatKes(transaction.amountExact ?? transaction.amount)}
                  </strong>
                  <span>
                    {new Date(transaction.transactionDate).toLocaleDateString(
                      "en-KE",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className={styles.emptyState}>
          <div>
            <Search size={32} aria-hidden="true" />
            <h2>No matching transactions</h2>
            <p>Try another merchant or category.</p>
          </div>
        </section>
      )}
    </div>
  );
}
