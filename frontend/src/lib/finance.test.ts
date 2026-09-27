import { describe, expect, it } from "vitest";

import { demoTransactions } from "@/data/demo-transactions";
import { calculateSummary, categoryTotals } from "@/lib/finance";

describe("financial calculations", () => {
  it("excludes transfers from income and expenses", () => {
    const summary = calculateSummary(demoTransactions);

    expect(summary.income).toBe(85000);
    expect(summary.expenses).toBe(19630);
    expect(summary.netCashFlow).toBe(65370);
  });

  it("identifies the largest expense category", () => {
    const summary = calculateSummary(demoTransactions);

    expect(summary.largestCategory).toBe("Housing");
    expect(summary.largestCategoryTotal).toBe(16500);
  });

  it("only includes expenses in category totals", () => {
    const totals = categoryTotals(demoTransactions);

    expect(totals.Groceries).toBe(2450);
    expect(totals.Transport).toBe(680);
    expect(totals.Savings).toBeUndefined();
    expect(totals.Salary).toBeUndefined();
  });
});
