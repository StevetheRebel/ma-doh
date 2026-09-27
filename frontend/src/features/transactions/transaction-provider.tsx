"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, allPages } from "@/lib/api";
import { toTransaction } from "@/lib/transaction-adapter";
import type {
  Account,
  ApiDraft,
  ApiTransaction,
  Balances,
  Capture,
  Fields,
  Profile,
} from "@/types/api";
async function load(signal?: AbortSignal) {
  const [profile, accounts, drafts, records, balances] = await Promise.all([
    api<Profile>("/me", { signal }),
    api<Account[]>("/accounts", { signal }),
    allPages<ApiDraft>("/drafts", signal),
    allPages<ApiTransaction>("/transactions", signal),
    api<Balances>("/accounts/balances", { signal }),
  ]);
  return {
    profile,
    accounts,
    drafts,
    records,
    balances,
    transactions: records.map(toTransaction),
  };
}
type Snapshot = Awaited<ReturnType<typeof load>>;
type Context = Snapshot & {
  revision: number;
  refresh: () => Promise<void>;
  createAccount: (body: Omit<Account, "id">) => Promise<void>;
  capture: (
    method: string,
    accountId: string,
    input: File | string,
  ) => Promise<Capture>;
  createManual: (body: Fields) => Promise<Capture>;
  saveDraft: (id: string, body: Fields) => Promise<void>;
  confirmDraft: (
    id: string,
    body: Fields,
    duplicate: boolean,
  ) => Promise<ApiTransaction>;
  dismissDraft: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, body: Fields) => Promise<void>;
};
const Store = createContext<Context | null>(null);
export function TransactionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(async () => {
    try {
      setData(await load());
      setError("");
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  if (!data)
    return (
      <div className="integration-state">
        {error || "Loading your financial records…"}
        {error && <button onClick={refresh}>Retry</button>}
      </div>
    );
  const patch = (body: Fields) => {
    const { currency, ...fields } = body;
    void currency;
    return JSON.stringify(fields);
  };
  const value: Context = {
    ...data,
    revision,
    refresh,
    createAccount: async (body) => {
      await api("/accounts", { method: "POST", body: JSON.stringify(body) });
      await refresh();
    },
    capture: async (method, accountId, input) => {
      let body: FormData | string;
      if (typeof input === "string")
        body = JSON.stringify({ account_id: accountId, text: input });
      else {
        body = new FormData();
        body.set("account_id", accountId);
        body.set("file", input);
      }
      const result = await api<Capture>(`/captures/${method}`, {
        method: "POST",
        body,
      });
      await refresh();
      return result;
    },
    createManual: async (body) => {
      const result = await api<Capture>("/captures/manual", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refresh();
      return result;
    },
    saveDraft: async (id, body) => {
      await api(`/drafts/${id}`, { method: "PATCH", body: patch(body) });
      await refresh();
    },
    confirmDraft: async (id, body, duplicate) => {
      await api(`/drafts/${id}`, { method: "PATCH", body: patch(body) });
      const result = await api<ApiTransaction>(`/drafts/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ allow_possible_duplicate: duplicate }),
      });
      await refresh();
      return result;
    },
    dismissDraft: async (id) => {
      await api(`/drafts/${id}`, { method: "DELETE" });
      await refresh();
    },
    deleteTransaction: async (id) => {
      await api(`/transactions/${id}`, { method: "DELETE" });
      await refresh();
    },
    updateTransaction: async (id, body) => {
      await api(`/transactions/${id}`, { method: "PATCH", body: patch(body) });
      await refresh();
    },
  };
  return (
    <Store.Provider value={value}>
      {error && (
        <div role="alert" className="integration-note">
          Records could not refresh: {error}{" "}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
      {children}
    </Store.Provider>
  );
}
export function useTransactions() {
  const value = useContext(Store);
  if (!value) throw new Error("TransactionProvider required");
  return value;
}
