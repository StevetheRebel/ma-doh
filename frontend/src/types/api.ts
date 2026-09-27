export type DecimalString = string;
export type ApiType = "income" | "expense" | "transfer";
export const apiCategories = {
  income: ["salary", "business", "gifts", "other_income"],
  expense: [
    "food",
    "transport",
    "rent",
    "utilities",
    "shopping",
    "health",
    "education",
    "entertainment",
    "fees",
    "other_expense",
  ],
} as const;
export const categoryLabels: Record<string, string> = {
  salary: "Salary",
  business: "Business",
  gifts: "Gifts",
  other_income: "Other income",
  food: "Food & groceries",
  transport: "Transport",
  rent: "Housing",
  utilities: "Utilities",
  shopping: "Shopping",
  health: "Health",
  education: "Education",
  entertainment: "Entertainment",
  fees: "Fees",
  other_expense: "Other expenses",
};
export type Account = {
  id: string;
  name: string;
  kind: "mpesa" | "bank" | "cash";
  opening_balance: DecimalString;
  opening_date: string;
  currency: "KES";
};
export type Profile = {
  id: string;
  name: string;
  timezone: string;
  currency: "KES";
  ai_enabled: boolean;
};
export type Fields = {
  account_id: string;
  destination_account_id: string | null;
  type: ApiType | null;
  category: string | null;
  amount: DecimalString | null;
  currency: "KES";
  occurred_on: string | null;
  description: string;
  counterparty: string | null;
  external_reference: string | null;
  payment_method: "mpesa" | "bank" | "cash" | "card" | "other" | null;
};
export type Duplicate = {
  id: string;
  description: string;
  amount: DecimalString;
  occurred_on: string;
};
export type ApiDraft = Fields & {
  id: string;
  capture_id: string;
  source: "receipt" | "voice" | "message" | "manual";
  status: "pending" | "confirmed" | "dismissed";
  warnings: string[];
  missing_fields: string[];
  possible_duplicates: Duplicate[];
  confidence: DecimalString | null;
  items: { description: string; amount: DecimalString | null }[];
  created_at: string;
};
export type ApiTransaction = Omit<
  ApiDraft,
  | "capture_id"
  | "status"
  | "warnings"
  | "missing_fields"
  | "possible_duplicates"
> & {
  type: ApiType;
  amount: DecimalString;
  occurred_on: string;
  draft_id: string | null;
  updated_at: string;
};
export type Capture = {
  id: string;
  source: string;
  text: string | null;
  warnings: string[];
  reused: boolean;
  drafts: ApiDraft[];
};
export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
export type Summary = {
  start_date: string;
  end_date: string;
  income: DecimalString;
  expenses: DecimalString;
  net_cash_flow: DecimalString;
  transfers: DecimalString;
  transaction_count: number;
  categories: {
    category: string;
    amount: DecimalString;
    count: number;
    share_percent: DecimalString;
  }[];
  basis: string;
};
export type Balances = {
  total_estimated_cash: DecimalString;
  as_of: string;
  basis: string;
  accounts: {
    account_id: string;
    name: string;
    kind: string;
    estimated_balance: DecimalString;
  }[];
};
export type Evidence = {
  items: {
    id: string;
    url: string;
    occurred_on: string;
    amount: DecimalString;
    type: ApiType;
    category: string | null;
    description: string;
    source: string;
  }[];
  total: number;
  truncated: boolean;
  transactions_url: string;
};
export type AskAnswer = {
  answer: string;
  operation: string;
  start_date: string;
  end_date: string;
  currency: "KES";
  transaction_count: number;
  evidence: Evidence;
  previous_evidence?: Evidence;
  basis: string;
  data: unknown;
};
