"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTransactions } from "./transaction-provider";
import { RecordFields, editableFields } from "./record-fields";
import type { ApiDraft } from "@/types/api";
import styles from "./transaction-pages.module.css";
export function ReviewTransactionForm() {
  const { drafts } = useTransactions();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get("draft"));
  const draft = drafts.find((d) => d.id === selected) ?? drafts[0];
  if (!draft)
    return (
      <section className={styles.emptyState}>
        <h2>No pending drafts</h2>
        <Link href="/transactions">View transactions</Link>
      </section>
    );
  return (
    <>
      <label className={styles.draftPicker}>
        <span>Pending drafts ({drafts.length})</span>
        <select value={draft.id} onChange={(e) => setSelected(e.target.value)}>
          {drafts.map((d, i) => (
            <option key={d.id} value={d.id}>
              {i + 1}. {d.description || d.source} —{" "}
              {d.amount ?? "Missing amount"}
            </option>
          ))}
        </select>
        <small>Select a draft to review before it affects your balance.</small>
      </label>
      <Review key={draft.id} draft={draft} />
    </>
  );
}
function Review({ draft }: { draft: ApiDraft }) {
  const { confirmDraft, saveDraft, dismissDraft } = useTransactions();
  const [value, setValue] = useState(() => editableFields(draft)),
    [duplicate, setDuplicate] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(kind: "confirm" | "save" | "dismiss") {
    setBusy(true);
    setError("");
    try {
      if (kind === "confirm") {
        await confirmDraft(draft.id, value, duplicate);
      } else if (kind === "save") {
        await saveDraft(draft.id, value);
        setNotice("Draft saved.");
      } else await dismissDraft(draft.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className={styles.formCard}
      onSubmit={(e) => {
        e.preventDefault();
        void action("confirm");
      }}
    >
      <div className={styles.formHeadingBlock}>
        <span>Review before saving</span>
        <h2>Review {draft.source} transaction</h2>
        <p>
          Check every extracted field before saving.{" "}
          {draft.confidence !== null &&
            `AI confidence: ${Math.round(Number(draft.confidence) * 100)}%.`}
        </p>
      </div>
      {draft.warnings.map((w, i) => (
        <p key={i} className={styles.warningBanner}>
          {w}
        </p>
      ))}
      {draft.missing_fields.length > 0 && (
        <p className={styles.warningBanner}>
          Complete these fields: {draft.missing_fields.join(", ")}.
        </p>
      )}
      <RecordFields value={value} onChange={setValue} />
      {draft.items.length > 0 && (
        <details>
          <summary>Receipt items</summary>
          {draft.items.map((item, i) => (
            <p key={i}>
              {item.description}: {item.amount ?? "unknown"}
            </p>
          ))}
        </details>
      )}
      {draft.possible_duplicates.map((d) => (
        <p className={styles.warningBanner} key={d.id}>
          Possible duplicate:{" "}
          <Link href={`/transactions/${d.id}`}>
            {d.description || d.occurred_on} — KES {d.amount}
          </Link>
        </p>
      ))}
      <label className={styles.checkboxRow}>
        <div>
          <strong>Save as a separate transaction</strong>
          <span>I checked any possible duplicate warning above.</span>
        </div>
        <input
          aria-label="Save as a separate transaction"
          checked={duplicate}
          onChange={(e) => setDuplicate(e.target.checked)}
          type="checkbox"
        />
      </label>
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.successBanner} role="status">
          {notice}
        </p>
      )}
      <div className={styles.formActions}>
        <button
          className={styles.dangerAction}
          disabled={busy}
          type="button"
          onClick={() => action("dismiss")}
        >
          Dismiss
        </button>
        <button
          className={styles.secondaryAction}
          disabled={busy}
          type="button"
          onClick={() => action("save")}
        >
          Save draft
        </button>
        <button disabled={busy} className={styles.primaryAction}>
          {busy ? "Saving…" : "Confirm and save"}
        </button>
      </div>
    </form>
  );
}
