"use client";
import { useTransactions } from "./transaction-provider";
import {
  apiCategories,
  categoryLabels,
  type Fields,
  type ApiType,
} from "@/types/api";
import styles from "./transaction-pages.module.css";
export function RecordFields({
  value,
  onChange,
}: {
  value: Fields;
  onChange: (value: Fields) => void;
}) {
  const { accounts } = useTransactions();
  const update = (key: keyof Fields, v: string | null) =>
    onChange({ ...value, [key]: v });
  return (
    <div className={styles.formGrid}>
      <label className={styles.field}>
        Account
        <select
          aria-label="Account"
          required
          value={value.account_id}
          onChange={(e) => update("account_id", e.target.value)}
        >
          <option value="">Choose account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <span className={styles.fieldHint}>Choose the balance this transaction changes.</span>
      </label>
      <label className={styles.field}>
        Type
        <select
          aria-label="Type"
          required
          value={value.type ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              type: e.target.value as ApiType,
              category: null,
              destination_account_id: null,
            })
          }
        >
          <option value="">Choose type</option>
          {["income", "expense", "transfer"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className={styles.fieldHint}>Income adds money; expenses subtract it.</span>
      </label>
      {value.type === "transfer" ? (
        <label className={styles.field}>
          Destination account
          <select
            aria-label="Destination account"
            required
            value={value.destination_account_id ?? ""}
            onChange={(e) => update("destination_account_id", e.target.value)}
          >
            <option value="">Choose destination</option>
            {accounts
              .filter((a) => a.id !== value.account_id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <span className={styles.fieldHint}>Where the transferred money arrived.</span>
        </label>
      ) : (
        <label className={styles.field}>
          Category
          <select
            aria-label="Category"
            required
            value={value.category ?? ""}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">Choose category</option>
            {(value.type ? apiCategories[value.type] : []).map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
              ))}
          </select>
          <span className={styles.fieldHint}>Used for spending and income insights.</span>
        </label>
      )}
      <label className={styles.field}>
        Amount (KES)
        <input
          aria-label="Amount (KES)"
          required
          type="number"
          min="0.01"
          max="99999999999999.99"
          step="0.01"
          value={value.amount ?? ""}
          onChange={(e) => update("amount", e.target.value || null)}
        />
        <span className={styles.fieldHint}>Enter the exact transaction amount.</span>
      </label>
      <label className={styles.field}>
        Date
        <input
          aria-label="Date"
          required
          type="date"
          value={value.occurred_on ?? ""}
          onChange={(e) => update("occurred_on", e.target.value || null)}
        />
        <span className={styles.fieldHint}>The date the money actually moved.</span>
      </label>
      <label className={styles.field}>
        Merchant / counterparty
        <input
          aria-label="Merchant / counterparty"
          maxLength={160}
          value={value.counterparty ?? ""}
          onChange={(e) => update("counterparty", e.target.value || null)}
        />
        <span className={styles.fieldHint}>Optional: who paid or received the money.</span>
      </label>
      <label className={styles.field}>
        Payment method
        <select
          aria-label="Payment method"
          value={value.payment_method ?? ""}
          onChange={(e) => update("payment_method", e.target.value || null)}
        >
          <option value="">Unspecified</option>
          {["mpesa", "bank", "cash", "card", "other"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <span className={styles.fieldHint}>Optional: how the payment was made.</span>
      </label>
      <label className={styles.field}>
        Reference
        <input
          aria-label="Reference"
          maxLength={100}
          value={value.external_reference ?? ""}
          onChange={(e) => update("external_reference", e.target.value || null)}
        />
        <span className={styles.fieldHint}>Optional: receipt, M-Pesa, or bank reference.</span>
      </label>
      <label className={styles.field}>
        Description
        <input
          aria-label="Description"
          maxLength={500}
          value={value.description}
          onChange={(e) => update("description", e.target.value)}
        />
        <span className={styles.fieldHint}>Add a short note that will make sense later.</span>
      </label>
    </div>
  );
}
export function editableFields(row: Fields): Fields {
  return {
    account_id: row.account_id,
    destination_account_id: row.destination_account_id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    currency: "KES",
    occurred_on: row.occurred_on,
    description: row.description,
    counterparty: row.counterparty,
    external_reference: row.external_reference,
    payment_method: row.payment_method,
  };
}
