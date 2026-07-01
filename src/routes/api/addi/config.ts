import { createFileRoute } from "@tanstack/react-router";
import { getAddiConfig } from "@/server/addi.server";

/**
 * GET /api/addi/config?amount=xxxx
 * Returns Addi availability + min/max + discount for the current cart total.
 * Called from the checkout to decide whether to show/enable Addi.
 */
export const Route = createFileRoute("/api/addi/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const amount = Number(url.searchParams.get("amount") || "0");
        if (!amount || amount < 1) {
          return Response.json(
            { error: "amount is required" },
            { status: 400 },
          );
        }
        try {
          const config = await getAddiConfig(amount);
          return Response.json(config);
        } catch (e: any) {
          return Response.json(
            { error: e?.message || "Addi config error" },
            { status: 502 },
          );
        }
      },
    },
  },
});
