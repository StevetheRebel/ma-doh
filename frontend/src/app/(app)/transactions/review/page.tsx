import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewTransactionForm } from "@/features/transactions/review-transaction-form";
import styles from "@/features/transactions/transaction-pages.module.css";

export default function ReviewTransactionPage() {
  return (
    <div className={styles.narrowPage}>
      <PageHeader eyebrow="Transaction draft" title="Review transaction" />
      <Suspense fallback={<p>Loading drafts…</p>}><ReviewTransactionForm /></Suspense>
    </div>
  );
}
