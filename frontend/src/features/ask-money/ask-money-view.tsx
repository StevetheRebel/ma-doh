"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { AskAnswer, Evidence } from "@/types/api";
import { formatKes } from "@/lib/finance";
import styles from "./ask-money-view.module.css";
const suggestions = [
  "How much did I spend on transport this month?",
  "Where is most of my money going this month?",
  "What is my cash flow this month?",
  "Compare my spending this month with last month",
];
export function AskMoneyView() {
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<AskAnswer | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function ask(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAnswer(null);
    setError("");
    try {
      setAnswer(
        await api<AskAnswer>("/ask", {
          method: "POST",
          body: JSON.stringify({ question }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.page}>
      <h1>Ask My Money</h1>
      <p>
        Answers use your confirmed records and include the transactions behind
        the calculation.
      </p>
      <div className={styles.suggestions}>
        {suggestions.map((q) => (
          <button key={q} onClick={() => setQuestion(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>
      <form className={styles.questionForm} onSubmit={ask}>
        <label className={styles.questionField}>
          <span>Your question</span>
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <small>
            Ask about spending, income, cash flow, or comparisons between periods.
          </small>
        </label>
        <button className={styles.askButton} disabled={busy}>
          {busy ? "Checking your records…" : "Ask"}
        </button>
      </form>
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
      {answer && (
        <article aria-live="polite">
          <h2>{answer.answer}</h2>
          <p>{answer.basis}</p>
          <EvidenceList evidence={answer.evidence} />
          {answer.previous_evidence && (
            <>
              <h3>Comparison period</h3>
              <EvidenceList evidence={answer.previous_evidence} />
            </>
          )}
        </article>
      )}
    </section>
  );
}
function EvidenceList({ evidence }: { evidence: Evidence }) {
  return (
    <>
      <p>
        {evidence.total} matching records
        {evidence.truncated ? `; showing ${evidence.items.length}` : ""}.
      </p>
      <ul>
        {evidence.items.map((t) => (
          <li key={t.id}>
            <Link href={`/transactions/${t.id}`}>
              {t.occurred_on}: {t.description || t.category || t.type} —{" "}
              {formatKes(t.amount)}
            </Link>
          </li>
        ))}
      </ul>
      {evidence.truncated && (
        <Link href="/transactions">Browse all transactions</Link>
      )}
    </>
  );
}
