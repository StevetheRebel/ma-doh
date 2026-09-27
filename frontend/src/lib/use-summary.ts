"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import { useTransactions } from "@/features/transactions/transaction-provider";
import type { Summary } from "@/types/api";
export function periodQuery(period: string) {
  if (period === "all") return "all_time=true";
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `start_date=${period}-01&end_date=${period}-${last}`;
}
export function useSummary(period: string) {
  const { revision } = useTransactions();
  const key = `${period}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    data?: Summary;
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    const c = new AbortController();
    api<Summary>(`/analytics/summary?${periodQuery(period)}`, {
      signal: c.signal,
    })
      .then((data) => setState({ key, data }))
      .catch((e) => {
        if (!c.signal.aborted) setState({ key, error: e.message });
      });
    return () => c.abort();
  }, [key, period]);
  return state.key === key ? state : { data: undefined, error: undefined };
}
