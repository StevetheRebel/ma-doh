"use client";

import {
  Landmark,
  Plus,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { formatKes } from "@/lib/finance";
import { todayInTimezone } from "@/lib/transaction-adapter";
import type { Account } from "@/types/api";
import styles from "./accounts-view.module.css";

const accountKinds: Record<
  Account["kind"],
  { label: string; icon: LucideIcon }
> = {
  mpesa: { label: "M-Pesa", icon: Smartphone },
  bank: { label: "Bank", icon: Landmark },
  cash: { label: "Cash", icon: Wallet },
};

export function AccountsView() {
  const { accounts, balances, profile, createAccount } = useTransactions();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await createAccount({
        name: String(data.get("name")),
        kind: String(data.get("kind")) as Account["kind"],
        opening_balance: String(data.get("balance")),
        opening_date: String(data.get("date")),
        currency: "KES",
      });
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Money settings</p>
          <h1>Accounts &amp; settings</h1>
          <p className={styles.intro}>
            Manage the places you keep money and the balances Ma-Doh tracks.
          </p>
        </div>
        <div className={styles.profileSummary}>
          <span>{profile.name}</span>
          <small>{profile.timezone} · KES</small>
        </div>
      </header>

      <section aria-labelledby="your-accounts-heading" className={styles.accountSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="your-accounts-heading">Your accounts</h2>
            <p>{balances.basis}</p>
          </div>
          <div className={styles.totalBalance}>
            <span>Total estimated balance</span>
            <strong>{formatKes(balances.total_estimated_cash)}</strong>
          </div>
        </div>

        {accounts.length ? (
          <div className={styles.accountGrid}>
            {accounts.map((account) => {
              const details = accountKinds[account.kind],
                Icon = details.icon,
                currentBalance = balances.accounts.find(
                  (balance) => balance.account_id === account.id,
                )?.estimated_balance;
              return (
                <article
                  className={styles.accountCard}
                  data-kind={account.kind}
                  key={account.id}
                >
                  <div className={styles.accountCardTop}>
                    <span className={styles.accountIcon} aria-hidden="true">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className={styles.kindBadge}>{details.label}</span>
                  </div>
                  <div className={styles.accountBalance}>
                    <span>Estimated balance</span>
                    <strong>{formatKes(currentBalance ?? "0")}</strong>
                  </div>
                  <div className={styles.accountMeta}>
                    <h3>{account.name}</h3>
                    <span>
                      Opened with {formatKes(account.opening_balance)} on{" "}
                      {account.opening_date}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyAccounts}>
            <Wallet size={22} aria-hidden="true" />
            <div>
              <strong>No financial accounts yet</strong>
              <span>Add one below to start recording transactions.</span>
            </div>
          </div>
        )}
      </section>

      <form className={styles.accountForm} onSubmit={submit}>
        <div className={styles.formHeading}>
          <span className={styles.formIcon} aria-hidden="true">
            <Plus size={22} />
          </span>
          <div>
            <h2>Add a financial account</h2>
            <p>
              Start with the balance you had at the beginning of your chosen
              date. Future transactions will adjust it automatically.
            </p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="account-name">Account name</label>
            <input
              aria-describedby="account-name-hint"
              id="account-name"
              maxLength={80}
              name="name"
              placeholder="e.g. Personal M-Pesa"
              required
            />
            <small id="account-name-hint">
              Use a name you will recognize in transaction lists.
            </small>
          </div>

          <div className={styles.field}>
            <label htmlFor="account-kind">Account type</label>
            <select
              aria-describedby="account-kind-hint"
              id="account-kind"
              name="kind"
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
            <small id="account-kind-hint">
              Choose where this money is actually held.
            </small>
          </div>

          <div className={styles.field}>
            <label htmlFor="opening-balance">Opening balance (KES)</label>
            <input
              aria-describedby="opening-balance-hint"
              defaultValue="0"
              id="opening-balance"
              name="balance"
              required
              step="0.01"
              type="number"
            />
            <small id="opening-balance-hint">
              Enter the balance at the start of the opening date.
            </small>
          </div>

          <div className={styles.field}>
            <label htmlFor="opening-date">Opening date</label>
            <input
              aria-describedby="opening-date-hint"
              defaultValue={todayInTimezone(profile.timezone)}
              id="opening-date"
              name="date"
              required
              type="date"
            />
            <small id="opening-date-hint">
              Transactions after this date will update the estimate.
            </small>
          </div>
        </div>

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.formFooter}>
          <p>You can add more accounts at any time.</p>
          <button className={styles.submitButton} disabled={busy}>
            <Plus size={17} aria-hidden="true" />
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
