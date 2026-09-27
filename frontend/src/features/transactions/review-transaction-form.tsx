"use client";

import { AlertTriangle, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTransactions } from "@/features/transactions/transaction-provider";
import {
  paymentMethods,
  transactionCategories,
  transactionDraftSchema,
  type Transaction,
} from "@/types/transaction";

import styles from "./transaction-pages.module.css";

function toLocalDateTimeValue(isoDate: string) {
  const date = new Date(isoDate);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReviewTransactionForm() {
  const router = useRouter();
  const { pendingDraft: draft, confirmTransaction, setPendingDraft } = useTransactions();
  const [error, setError] = useState("");

  if (!draft) {
    return (
      <section className={styles.emptyState}>
        <div>
          <AlertTriangle size={32} aria-hidden="true" />
          <h2>No transaction to review</h2>
          <p>Start a manual transaction before opening the review step.</p>
          <Link className={styles.primaryAction} href="/transactions/add/manual">
            Enter transaction
          </Link>
        </div>
      </section>
    );
  }

  function update<K extends keyof Transaction>(field: K, value: Transaction[K]) {
    if (draft) {
      setPendingDraft({ ...draft, [field]: value });
    }
  }

  function confirm() {
    if (!draft) {
      return;
    }

    const result = transactionDraftSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the transaction fields.");
      return;
    }

    const confirmed = confirmTransaction(result.data);
    router.push(`/transactions/${confirmed.id}?saved=true`);
    window.setTimeout(() => setPendingDraft(null), 0);
  }

  function returnToEdit() {
    setPendingDraft(draft);
    router.push("/transactions/add/manual");
  }

  return (
    <section className={styles.reviewCard}>
      <div className={styles.reviewNotice}>
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>Review before saving</strong>
          <p>Only confirmed records are included in your financial totals.</p>
        </div>
      </div>

      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      <div className={styles.reviewGrid}>
        <label className={styles.reviewField}>
          <span>Type</span>
          <select
            value={draft.type}
            onChange={(event) => update("type", event.target.value as Transaction["type"])}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
            <option value="refund">Refund</option>
            <option value="other">Other</option>
          </select>
        </label>

        {draft.attachmentName ? (
          <div className={styles.reviewField}>
            <span>Receipt</span>
            <strong>{draft.attachmentName}</strong>
          </div>
        ) : null}

        <label className={styles.reviewField}>
          <span>Amount (KES)</span>
          <input
            type="number"
            min="1"
            step="0.01"
            value={draft.amount}
            onChange={(event) => update("amount", Number(event.target.value))}
          />
        </label>

        <label className={styles.reviewField}>
          <span>Source or merchant</span>
          <input
            value={draft.merchant ?? ""}
            onChange={(event) => update("merchant", event.target.value)}
          />
        </label>

        <label className={styles.reviewField}>
          <span>Category</span>
          <select
            value={draft.category}
            onChange={(event) => update("category", event.target.value as Transaction["category"])}
          >
            {transactionCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>

        <label className={styles.reviewField}>
          <span>Payment method</span>
          <select
            value={draft.paymentMethod ?? "Other"}
            onChange={(event) => update("paymentMethod", event.target.value as Transaction["paymentMethod"])}
          >
            {paymentMethods.map((method) => <option key={method}>{method}</option>)}
          </select>
        </label>

        <label className={styles.reviewField}>
          <span>Date and time</span>
          <input
            type="datetime-local"
            required
            value={toLocalDateTimeValue(draft.transactionDate)}
            onChange={(event) => {
              if (event.target.value) {
                update("transactionDate", new Date(event.target.value).toISOString());
              }
            }}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.secondaryAction} type="button" onClick={returnToEdit}>
          <ArrowLeft size={17} aria-hidden="true" />
          Edit details
        </button>
        <button className={styles.primaryAction} type="button" onClick={confirm}>
          <Check size={18} aria-hidden="true" />
          Confirm and save
        </button>
      </div>
    </section>
  );
}
