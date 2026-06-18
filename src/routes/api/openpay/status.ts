import { createFileRoute } from "@tanstack/react-router";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

/**
 * GET /api/openpay/status?id={transaction_id}
 * Returns { status } for the given Openpay charge.
 */
export const Route = createFileRoute("/api/openpay/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          if (!id || !/^[A-Za-z0-9_-]{3,80}$/.test(id)) {
            return new Response(
              JSON.stringify({ error_code: "invalid_input", description: "Missing or invalid id" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          const res = await openpayFetch(`/charges/${encodeURIComponent(id)}`, { method: "GET" });
          if (!res.ok) return passthroughOpenpayError(res);
          const data = await res.json();
          return Response.json({
            id: data?.id,
            status: data?.status, // e.g. "completed", "in_progress", "failed"
          });
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
