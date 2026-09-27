import type { ReactNode } from "react";
import { RequireAuth } from "@/features/auth/auth-provider";

import { AppPreferencesProvider } from "@/components/layout/app-preferences";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionProvider } from "@/features/transactions/transaction-provider";

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth><TransactionProvider>
      <AppPreferencesProvider>
        <AppShell>{children}</AppShell>
      </AppPreferencesProvider>
    </TransactionProvider></RequireAuth>
  );
}
