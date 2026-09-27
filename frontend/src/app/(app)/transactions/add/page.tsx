import { Camera, ChevronRight, MessageSquareText, Mic, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { CaptureMethodPanel, type CaptureMethod } from "@/features/transactions/capture-method-panel";
import styles from "@/features/transactions/transaction-pages.module.css";

const methods = [
  { title: "Scan receipt", detail: "Photograph or upload a receipt", icon: Camera, href: "/transactions/add?method=receipt" },
  { title: "Record voice", detail: "Describe one or more transactions", icon: Mic, href: "/transactions/add?method=voice" },
  { title: "Paste message", detail: "Use a selected M-Pesa or bank message", icon: MessageSquareText, href: "/transactions/add?method=message" },
  { title: "Enter manually", detail: "Record income or an expense directly", icon: Plus, href: "/transactions/add/manual" },
] as const;

export default async function AddTransactionPage({ searchParams }: { searchParams: Promise<{ method?: string }> }) {
  const requestedMethod = (await searchParams).method;
  const method = (["receipt", "voice", "message"] as const).find((item) => item === requestedMethod) as CaptureMethod | undefined;
  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Transactions" title="Add money activity" />
      <section className={styles.methodGrid} aria-label="Capture methods">
        {methods.map(({ title, detail, icon: Icon, href }) => {
          const content = (
            <>
              <div className={styles.methodCardHeader}>
                <span className={styles.methodIcon}><Icon size={22} aria-hidden="true" /></span>
                <ChevronRight size={19} aria-hidden="true" />
              </div>
              <div>
                <h2>{title}</h2>
                <p>{detail}</p>
              </div>
            </>
          );

          return (
            <Link className={styles.methodCard} href={href} key={title}>
              {content}
            </Link>
          );
        })}
      </section>
      {method ? <CaptureMethodPanel method={method} /> : null}
    </div>
  );
}
