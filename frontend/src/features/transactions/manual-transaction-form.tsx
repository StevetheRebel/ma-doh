"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AccountRequiredModal } from "@/features/accounts/account-required-modal";
import { useTransactions } from "./transaction-provider";
import { RecordFields } from "./record-fields";
import { todayInTimezone } from "@/lib/transaction-adapter";
import type { Fields } from "@/types/api";
import styles from "./transaction-pages.module.css";
export function ManualTransactionForm() {
  const { accounts, profile, createManual } = useTransactions();
  const router = useRouter();
  const [value, setValue] = useState<Fields>({
    account_id: accounts[0]?.id ?? "",
    destination_account_id: null,
    type: "expense",
    category: null,
    amount: null,
    currency: "KES",
    occurred_on: todayInTimezone(profile.timezone),
    description: "",
    counterparty: null,
    external_reference: null,
    payment_method: null,
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await createManual(value);
      router.push(`/transactions/review?draft=${result.drafts[0].id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  if (!accounts.length)
    return <AccountRequiredModal />;
  return (
    <form className={styles.formCard} onSubmit={submit}>
      <div className={styles.formHeadingBlock}>
        <span>Manual entry</span>
        <h2>Add transaction details</h2>
        <p>Required fields are account, type, category, amount, and date.</p>
      </div>
      <RecordFields value={value} onChange={setValue} />
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        <button className={styles.primaryAction} disabled={busy}>
          {busy ? "Saving draft…" : "Review transaction"}
        </button>
      </div>
    </form>
  );
}
