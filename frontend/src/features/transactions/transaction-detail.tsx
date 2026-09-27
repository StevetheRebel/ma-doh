"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";

import { useState } from "react";
import { RecordFields, editableFields } from "./record-fields";
import { PageHeader } from "@/components/layout/page-header";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { formatKes } from "@/lib/finance";

import styles from "./transaction-pages.module.css";

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { transactions, records, updateTransaction, deleteTransaction } =
    useTransactions();
  const router = useRouter();
  const [editing, setEditing] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const record = records.find((t) => t.id === id);
  const [value, setValue] = useState(() =>
    record ? editableFields(record) : null,
  );
  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) {
    return (
      <div className={styles.narrowPage}>
        <PageHeader eyebrow="Transaction" title="Record not found" />
        <section className={styles.emptyState}>
          <div>
            <p>
              This transaction is not available in the your financial records.
            </p>
            <Link className={styles.primaryAction} href="/transactions">
              Return to transactions
            </Link>
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
    [
      "Date",
      new Date(transaction.transactionDate).toLocaleDateString("en-KE", {
        dateStyle: "medium",
      }),
    ],
    ["Source", transaction.source],
    ["Reference", transaction.reference ?? "Not supplied"],
    ["Notes", transaction.description || "None"],
  ];

  return (
    <div className={styles.narrowPage}>
      <PageHeader eyebrow="Confirmed transaction" title="Transaction details" />
      {saved ? (
        <div className={styles.reviewNotice} role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>Transaction saved</strong>
            <p>Your dashboard has been recalculated.</p>
          </div>
        </div>
      ) : null}
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
      {editing && value && (
        <form
          className={styles.formCard}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await updateTransaction(id, value);
              setEditing(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className={styles.formHeadingBlock}>
            <span>Edit confirmed record</span>
            <h2>Update transaction details</h2>
            <p>Changes immediately recalculate balances and insights.</p>
          </div>
          <RecordFields value={value} onChange={setValue} />
          <div className={styles.formActions}>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button className={styles.primaryAction} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
      <article className={styles.detailCard}>
        <header className={styles.detailHeader}>
          <div>
            <span className={styles.typeBadge}>{transaction.type}</span>
            <h2>{transaction.merchant}</h2>
            <p>{transaction.category}</p>
          </div>
          <strong>
            {transaction.type === "income"
              ? "+ "
              : transaction.type === "transfer"
                ? ""
                : "- "}
            {formatKes(transaction.amountExact ?? transaction.amount)}
          </strong>
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
          <button
            disabled={busy}
            onClick={() => {
              if (record) setValue(editableFields(record));
              setEditing(true);
            }}
          >
            Edit
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete this confirmed transaction? Your totals will be recalculated.",
                )
              )
                return;
              setBusy(true);
              try {
                await deleteTransaction(id);
                router.push("/transactions");
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            Delete
          </button>
        </div>
      </article>
    </div>
  );
}
