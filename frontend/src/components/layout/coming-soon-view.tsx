import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";

import styles from "./coming-soon-view.module.css";

export function ComingSoonView({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader eyebrow="Planned workspace" title={title} />
      <section className={styles.panel}>
        <Construction size={30} aria-hidden="true" />
        <h2>Coming in the next build</h2>
        <p>{description}</p>
        <Link href="/dashboard">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
