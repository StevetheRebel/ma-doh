import type { ApiTransaction } from "@/types/api";
import type { Transaction } from "@/types/transaction";

const categories: Record<string, Transaction["category"]> = {
  salary: "Salary", business: "Business", gifts: "Gifts", other_income: "Other income", food: "Groceries",
  transport: "Transport", rent: "Housing", utilities: "Utilities", shopping: "Shopping", health: "Health",
  education: "Education", entertainment: "Entertainment", fees: "Fees", other_expense: "Other expenses",
};
const methods: Record<string, Transaction["paymentMethod"]> = { mpesa: "M-Pesa", bank: "Bank", cash: "Cash", card: "Card", other: "Other" };
export function toTransaction(row: ApiTransaction): Transaction {
  return {
    id: row.id, type: row.type, amount: Number(row.amount), amountExact: row.amount, currency: "KES",
    merchant: row.counterparty, category: row.category ? categories[row.category] ?? "Other" : "Other",
    description: row.description, transactionDate: `${row.occurred_on}T12:00:00+03:00`,
    paymentMethod: row.payment_method ? methods[row.payment_method] ?? "Other" : null,
    reference: row.external_reference, source: row.source,
    confidence: row.confidence === null ? null : Number(row.confidence), verificationStatus: "confirmed",
    createdAt: row.created_at, recurring: false, attachmentName: null,
  };
}
export function todayInTimezone(timezone = "Africa/Nairobi") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
