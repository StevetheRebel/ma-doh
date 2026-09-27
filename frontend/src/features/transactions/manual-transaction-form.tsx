"use client";

import { ArrowLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ZodError } from "zod";

import { useTransactions } from "@/features/transactions/transaction-provider";
import {
  createManualDraft,
  paymentMethods,
  transactionCategories,
  type ManualTransactionInput,
} from "@/types/transaction";

import styles from "./transaction-pages.module.css";

const defaultInput: ManualTransactionInput = {
  type: "expense",
  amount: "",
  merchant: "",
  category: "Groceries",
  paymentMethod: "M-Pesa",
  date: "2026-09-27",
  time: "12:00",
  description: "",
  recurring: false,
  attachmentName: null,
};

function toLocalInputParts(isoDate: string) {
  const date = new Date(isoDate);
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function ManualTransactionForm() {
  const router = useRouter();
  const { pendingDraft, setPendingDraft } = useTransactions();
  const [input, setInput] = useState<ManualTransactionInput>(() => {
    if (!pendingDraft || pendingDraft.source !== "manual") {
      return defaultInput;
    }

    const localDateTime = toLocalInputParts(pendingDraft.transactionDate);
    return {
      type: pendingDraft.type === "income" ? "income" : "expense",
      amount: String(pendingDraft.amount),
      merchant: pendingDraft.merchant ?? "",
      category: pendingDraft.category,
      paymentMethod: pendingDraft.paymentMethod ?? "M-Pesa",
      date: localDateTime.date,
      time: localDateTime.time,
      description: pendingDraft.description,
      recurring: pendingDraft.recurring,
      attachmentName: pendingDraft.attachmentName ?? null,
    };
  });
  const [error, setError] = useState("");

  function update<K extends keyof ManualTransactionInput>(
    field: K,
    value: ManualTransactionInput[K],
  ) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const draft = createManualDraft(input);
      setPendingDraft(draft);
      router.push("/transactions/review");
    } catch (reason) {
      if (reason instanceof ZodError) {
        setError(reason.issues[0]?.message ?? "Check the transaction details.");
        return;
      }
      setError("We could not prepare this transaction. Check the details and try again.");
    }
  }

  return (
    <form className={styles.formCard} onSubmit={submit} noValidate>
      <div className={styles.segmented} aria-label="Transaction type">
        <button
          className={input.type === "expense" ? styles.selected : ""}
          type="button"
          aria-pressed={input.type === "expense"}
          onClick={() => update("type", "expense")}
        >
          Expense
        </button>
        <button
          className={input.type === "income" ? styles.selected : ""}
          type="button"
          aria-pressed={input.type === "income"}
          onClick={() => update("type", "income")}
        >
          Income
        </button>
      </div>

      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      <div className={styles.formGrid}>
        <div className={styles.fullField}>
          <label htmlFor="amount">Amount</label>
          <div className={styles.amountInput}>
            <span>KES</span>
            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              value={input.amount}
              onChange={(event) => update("amount", event.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.fullField}>
          <label htmlFor="merchant">{input.type === "income" ? "Source" : "Merchant or payee"}</label>
          <input
            id="merchant"
            name="merchant"
            value={input.merchant}
            onChange={(event) => update("merchant", event.target.value)}
            placeholder={input.type === "income" ? "e.g. Salary, client payment" : "e.g. Naivas Supermarket"}
            required
          />
        </div>

        {input.type === "expense" ? (
          <>
            <div className={styles.field}>
              <label htmlFor="category">Category</label>
              <select id="category" name="category" value={input.category} onChange={(event) => update("category", event.target.value as ManualTransactionInput["category"])}>
                {transactionCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="payment-method">Payment method</label>
              <select id="payment-method" name="paymentMethod" value={input.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value as ManualTransactionInput["paymentMethod"])}>
                {paymentMethods.map((method) => <option key={method}>{method}</option>)}
              </select>
            </div>
          </>
        ) : null}

        <div className={styles.field}>
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={input.date}
            onChange={(event) => update("date", event.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="time">Time</label>
          <input
            id="time"
            name="time"
            type="time"
            value={input.time}
            onChange={(event) => update("time", event.target.value)}
            required
          />
        </div>

        {input.type === "expense" ? (
          <>
            <div className={styles.fullField}>
              <label htmlFor="description">Notes (optional)</label>
              <textarea id="description" name="description" value={input.description} onChange={(event) => update("description", event.target.value)} placeholder="Add context you may need later" />
            </div>
            <div className={styles.fullField}>
              <span className={styles.fieldLabel}>Receipt (optional)</span>
              {input.attachmentName ? (
                <div className={styles.attachmentRow}>
                  <ImagePlus size={19} aria-hidden="true" />
                  <span>{input.attachmentName}</span>
                  <button type="button" aria-label="Remove receipt" onClick={() => update("attachmentName", null)}><X size={17} /></button>
                </div>
              ) : (
                <label className={styles.uploadButton} htmlFor="manual-receipt"><ImagePlus size={18} aria-hidden="true" />Add receipt</label>
              )}
              <input className={styles.visuallyHidden} id="manual-receipt" type="file" accept="image/*" onChange={(event) => update("attachmentName", event.target.files?.[0]?.name ?? null)} />
            </div>
          </>
        ) : null}

        <label className={`${styles.checkboxRow} ${styles.fullField}`}>
          <div>
            <strong>Recurring transaction</strong>
            <span>Include this record when identifying regular commitments</span>
          </div>
          <input
            type="checkbox"
            checked={input.recurring}
            onChange={(event) => update("recurring", event.target.checked)}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <Link className={styles.secondaryAction} href="/transactions/add">
          <ArrowLeft size={17} aria-hidden="true" />
          Back
        </Link>
        <button className={styles.primaryAction} type="submit">
          Review transaction
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
