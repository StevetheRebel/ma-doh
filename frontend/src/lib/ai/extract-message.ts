import type { TransactionDraft } from "@/types/transaction";
import { apiRequest } from "@/lib/integrations/api";

export async function extractMessage(
  input: string
): Promise<TransactionDraft> {
  return apiRequest<TransactionDraft>("/api/extract/message", {
    method: "POST",
    body: JSON.stringify({
      message: input,
    }),
  });
}