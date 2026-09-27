"use client";

import { ArrowRight, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "@/features/transactions/transaction-pages.module.css";

export function AccountRequiredModal() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    <dialog
      aria-describedby="account-required-description"
      aria-labelledby="account-required-title"
      className={styles.accountModal}
      onCancel={(event) => event.preventDefault()}
      ref={dialog}
    >
      <div className={styles.accountModalCard}>
        <div className={styles.accountModalIcon} aria-hidden="true">
          <WalletCards size={28} strokeWidth={1.8} />
        </div>
        <p className={styles.accountModalEyebrow}>One quick setup</p>
        <h2 id="account-required-title">Add your first financial account</h2>
        <p id="account-required-description">
          Choose M-Pesa, bank, or cash and enter its opening balance. Ma-Doh
          needs this before it can keep your transactions and balances
          accurate. This is separate from your login account.
        </p>
        <div className={styles.accountModalActions}>
          <Link className={styles.primaryAction} href="/settings">
            Set up account
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className={styles.modalDismiss} href="/transactions">
            Maybe later
          </Link>
        </div>
      </div>
    </dialog>
  );
}
