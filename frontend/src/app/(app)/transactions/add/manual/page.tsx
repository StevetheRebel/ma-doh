import { PageHeader } from "@/components/layout/page-header";
import { ManualTransactionForm } from "@/features/transactions/manual-transaction-form";
import styles from "@/features/transactions/transaction-pages.module.css";

export default function ManualTransactionPage() {
  return (
    <div className={styles.narrowPage}>
      <PageHeader eyebrow="Add transaction" title="Enter transaction manually" />
      <ManualTransactionForm />
    </div>
  );
}
