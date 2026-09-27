export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "debt_repayment"
  | "loan_received"
  | "savings"
  | "investment"
  | "refund"
  | "other";

export type TransactionSource =
  | "receipt"
  | "message"
  | "voice"
  | "manual";

export interface TransactionDraft {
  type: TransactionType;
  amount: number;
  currency: "KES";
  category: string;
  merchant?: string;
  recipient?: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  source: TransactionSource;
  confidence?: number;
}

export interface Transaction extends TransactionDraft {
  id: string;
  verified: boolean;
}