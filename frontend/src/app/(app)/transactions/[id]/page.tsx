import { Suspense } from "react";

import { TransactionDetail } from "@/features/transactions/transaction-detail";

export default function TransactionDetailPage() {
  return (
    <Suspense fallback={null}>
      <TransactionDetail />
    </Suspense>
  );
}
