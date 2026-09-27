"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const appPeriods = [
  { value: "2026-09", label: "Sep 2026" },
  { value: "2026-08", label: "Aug 2026" },
  { value: "2026-07", label: "Jul 2026" },
  { value: "all", label: "All records" },
] as const;

export type AppPeriod = (typeof appPeriods)[number]["value"];

type AppPreferencesValue = {
  period: AppPeriod;
  setPeriod: (period: AppPeriod) => void;
  hideAmounts: boolean;
  toggleAmounts: () => void;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<AppPeriod>("2026-09");
  const [hideAmounts, setHideAmounts] = useState(false);
  const value = useMemo(
    () => ({
      period,
      setPeriod,
      hideAmounts,
      toggleAmounts: () => setHideAmounts((current) => !current),
    }),
    [hideAmounts, period],
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
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return context;
}
