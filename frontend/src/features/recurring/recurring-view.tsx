"use client";

import {
  Car,
  Check,
  CreditCard,
  Droplet,
  Home,
  Landmark,
  Play,
  Sparkles,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useAppPreferences } from "@/components/layout/app-preferences";
import { formatKes } from "@/lib/finance";

import styles from "./recurring-view.module.css";

type Status = "upcoming" | "paid" | "overdue";
type Frequency = "Monthly" | "Weekly" | "Yearly";

type Commitment = {
  id: string;
  name: string;
  category: string;
  frequency: Frequency;
  method: string;
  amount: number;
  nextDue: string;
  status: Status;
  icon: LucideIcon;
  iconColor?: string;
};

const initialCommitments: Commitment[] = [
  { id: "c1", name: "Riverside Apartments", category: "Rent", frequency: "Monthly", method: "Bank", amount: 18000, nextDue: "2026-10-01", status: "upcoming", icon: Home },
  { id: "c2", name: "Equity Bank", category: "Loan repayment", frequency: "Monthly", method: "Bank", amount: 8500, nextDue: "2026-10-05", status: "upcoming", icon: Landmark },
  { id: "c3", name: "Netflix", category: "Streaming", frequency: "Monthly", method: "Card", amount: 1100, nextDue: "2026-10-20", status: "paid", icon: Play, iconColor: "#e50914" },
  { id: "c4", name: "Safaricom", category: "Data bundle", frequency: "Monthly", method: "M-Pesa", amount: 1000, nextDue: "2026-10-25", status: "paid", icon: Wifi },
  { id: "c5", name: "Kenya Power", category: "Electricity", frequency: "Monthly", method: "M-Pesa", amount: 2500, nextDue: "2026-10-23", status: "paid", icon: Zap, iconColor: "#3a7bd5" },
  { id: "c6", name: "Nairobi Water", category: "Water", frequency: "Monthly", method: "M-Pesa", amount: 850, nextDue: "2026-10-23", status: "paid", icon: Droplet, iconColor: "#3a7bd5" },
  { id: "c7", name: "Fuliza", category: "Overdraft", frequency: "Weekly", method: "M-Pesa", amount: 1200, nextDue: "2026-09-24", status: "overdue", icon: CreditCard },
];

const initialSuggestions: Commitment[] = [
  { id: "s1", name: "Bolt — Weekday commute", category: "About 680 every week", frequency: "Weekly", method: "M-Pesa", amount: 680, nextDue: "", status: "upcoming", icon: Car, iconColor: "#3a7bd5" },
];

const statusLabels: Record<Status, string> = {
  upcoming: "Upcoming",
  paid: "Paid",
  overdue: "Overdue",
};

function formatNextDue(iso: string) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecurringView() {
  const { hideAmounts } = useAppPreferences();
  const money = (value: number) =>
    hideAmounts ? "KES ••••••" : formatKes(value);
  const maskString = (text: string) =>
    hideAmounts
      ? text.replace(/(?:KES\s?)?[\d,]+(?:\.\d+)?/g, (match) =>
          /\d/.test(match) ? "KES ••••••" : match
        )
      : text;

  const [commitments, setCommitments] = useState<Commitment[]>(initialCommitments);
  const [suggestions, setSuggestions] = useState<Commitment[]>(initialSuggestions);

  const dueSoon = useMemo(
    () =>
      commitments
        .filter((c) => c.status === "upcoming" || c.status === "overdue")
        .reduce((sum, c) => sum + c.amount, 0),
    [commitments]
  );

  const monthlyOutflow = useMemo(
    () =>
      commitments
        .filter((c) => c.frequency === "Monthly")
        .reduce((sum, c) => sum + c.amount, 0),
    [commitments]
  );

  const confirmSuggestion = (item: Commitment) => {
    setCommitments((prev) => [
      ...prev,
      { ...item, id: crypto.randomUUID(), nextDue: "", status: "upcoming" },
    ]);
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Recurring Payments</h1>
        <p>What you owe, what you use, and what&apos;s left</p>
      </header>

      <section className={styles.summaryGrid} aria-label="Recurring summary">
        <article>
          <span>Due soon</span>
          <strong className={styles.warning}>{money(dueSoon)}</strong>
          <small>Next 7 days</small>
        </article>
        <article>
          <span>Active commitments</span>
          <strong>{commitments.length}</strong>
        </article>
        <article>
          <span>Monthly outflow</span>
          <strong>{money(monthlyOutflow)}</strong>
        </article>
        <article>
          <span>Awaiting review</span>
          <strong className={styles.warning}>{suggestions.length}</strong>
          <small>AI-detected</small>
        </article>
      </section>

      <section className={styles.commitmentsCard} aria-label="Your commitments">
        <h2 className={styles.cardTitle}>Your commitments</h2>
        <ul className={styles.commitmentList}>
          {commitments.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <span
                  className={styles.iconWrap}
                  style={item.iconColor ? { color: item.iconColor } : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{item.name}</span>
                    <span className={`${styles.badge} ${styles[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                  </div>
                  <p>
                    {item.category} · {item.frequency} · {item.method}
                  </p>
                </div>
                <div className={styles.amountBlock}>
                  <strong>{money(item.amount)}</strong>
                  {item.nextDue && (
                    <small>Next {formatNextDue(item.nextDue)}</small>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {suggestions.length > 0 && (
        <section
          className={styles.suggestionSection}
          aria-label="Suggested recurring"
        >
          <div className={styles.suggestionHeader}>
            <Sparkles size={15} aria-hidden="true" />
            <span>Ma-Doh thinks these might be recurring</span>
          </div>
          {suggestions.map((item) => {
            const Icon = item.icon;
            return (
              <div className={styles.suggestionItem} key={item.id}>
                <span
                  className={styles.iconWrap}
                  style={item.iconColor ? { color: item.iconColor } : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{item.name}</span>
                  </div>
                  <p>
                    {maskString(item.category)} · {item.method}
                  </p>
                </div>
                <div className={styles.suggestionActions}>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    onClick={() => confirmSuggestion(item)}
                  >
                    <Check size={14} /> Confirm
                  </button>
                  <button
                    type="button"
                    className={styles.dismissBtn}
                    onClick={() => dismissSuggestion(item.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}