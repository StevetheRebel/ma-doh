import { z } from "zod";

export const transactionTypes = [
  "income",
  "expense",
  "transfer",
  "refund",
  "other",
] as const;

export const transactionCategories = [
  "Salary",
  "Business",
  "Groceries",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Education",
  "Entertainment",
  "Shopping",
  "Savings",
  "Gifts",
  "Fees",
  "Other income",
  "Other expenses",
  "Other",
] as const;

export const paymentMethods = [
  "M-Pesa",
  "Cash",
  "Card",
  "Bank",
  "Other",
] as const;

export const transactionSources = [
  "receipt",
  "voice",
  "message",
  "manual",
] as const;

export const transactionDraftSchema = z.object({
  id: z.string().min(1),
  type: z.enum(transactionTypes),
  amount: z.number().positive("Amount must be greater than zero"),
  amountExact: z.string().optional(),
  currency: z.literal("KES"),
  merchant: z.string().trim().min(1, "Source is required").nullable(),
  category: z.enum(transactionCategories),
  description: z.string().trim().max(240),
  transactionDate: z.string().datetime({ offset: true }),
  paymentMethod: z.enum(paymentMethods).nullable(),
  reference: z.string().trim().max(60).nullable(),
  source: z.enum(transactionSources),
  confidence: z.number().min(0).max(1).nullable(),
  verificationStatus: z.enum(["draft", "confirmed", "rejected"]),
  createdAt: z.string().datetime({ offset: true }),
  recurring: z.boolean().default(false),
  attachmentName: z.string().trim().max(160).nullable().optional(),
});

export type Transaction = z.infer<typeof transactionDraftSchema>;
export type TransactionType = Transaction["type"];
export type TransactionCategory = Transaction["category"];
export type PaymentMethod = NonNullable<Transaction["paymentMethod"]>;

export type ManualTransactionInput = {
  type: "income" | "expense";
  amount: string;
  merchant: string;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  date: string;
  time: string;
  description: string;
  recurring: boolean;
  attachmentName: string | null;
};

export function createManualDraft(input: ManualTransactionInput): Transaction {
  const timestamp = new Date(`${input.date}T${input.time}:00+03:00`).toISOString();

  return transactionDraftSchema.parse({
    id: crypto.randomUUID(),
    type: input.type,
    amount: Number(input.amount),
    currency: "KES",
    merchant: input.merchant,
    category: input.type === "income" ? "Salary" : input.category,
    description: input.type === "income" ? "" : input.description,
    transactionDate: timestamp,
    paymentMethod: input.type === "income" ? "Other" : input.paymentMethod,
    reference: null,
    source: "manual",
    confidence: null,
    verificationStatus: "draft",
    createdAt: new Date().toISOString(),
    recurring: input.recurring,
    attachmentName: input.type === "income" ? null : input.attachmentName,
  });
}
