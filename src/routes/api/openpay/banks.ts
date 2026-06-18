import { createFileRoute } from "@tanstack/react-router";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

/**
 * GET /api/openpay/banks
 * Lists PSE banks for the merchant. Returns [{ bankCode, bankName }].
 */
export const Route = createFileRoute("/api/openpay/banks")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await openpayFetch("/banks/pse", { method: "GET" });
          if (!res.ok) return passthroughOpenpayError(res);
          const data = await res.json();
          // Openpay returns either an array or { banks: [...] } depending on env.
          const list: Array<{ bank_code?: string; name?: string }> =
            Array.isArray(data) ? data : data?.banks ?? [];
          const banks = list
            .map((b) => ({
              bankCode: String(b.bank_code ?? ""),
              bankName: String(b.name ?? ""),
            }))
            .filter((b) => b.bankCode && b.bankName);
          return Response.json(banks);
        } catch (e: any) {
          if (e instanceof Response) return e;
          return new Response(
            JSON.stringify({ error_code: "server_error", description: e?.message ?? "Unexpected error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
