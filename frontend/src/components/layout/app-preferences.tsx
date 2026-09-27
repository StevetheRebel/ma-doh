"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useTransactions } from "@/features/transactions/transaction-provider";
import { todayInTimezone } from "@/lib/transaction-adapter";

export type AppPeriod = string;

type AppPreferencesValue = {
  appPeriods: { value: string; label: string }[];
  period: AppPeriod;
  setPeriod: (period: AppPeriod) => void;
  hideAmounts: boolean;
  toggleAmounts: () => void;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const { profile, records } = useTransactions();
  const current = todayInTimezone(profile.timezone).slice(0, 7);
  const appPeriods = useMemo(() => {
    const [year, month] = current.split("-").map(Number);
    const months = new Set(records.map((r) => r.occurred_on.slice(0, 7)));
    for (let i = 0; i < 24; i++)
      months.add(
        new Date(Date.UTC(year, month - 1 - i, 1)).toISOString().slice(0, 7),
      );
    return [
      ...[...months]
        .sort()
        .reverse()
        .map((value) => ({
          value,
          label: new Date(`${value}-01T12:00:00Z`).toLocaleDateString("en-KE", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
        })),
      { value: "all", label: "All records" },
    ];
  }, [current, records]);
  const [period, setPeriod] = useState<AppPeriod>(current);
  const [hideAmounts, setHideAmounts] = useState(false);
  const value = useMemo(
    () => ({
      appPeriods,
      period,
      setPeriod,
      hideAmounts,
      toggleAmounts: () => setHideAmounts((current) => !current),
    }),
    [hideAmounts, period, appPeriods],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }
  return context;
}
