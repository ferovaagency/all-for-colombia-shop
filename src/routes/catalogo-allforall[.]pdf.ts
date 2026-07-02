import { createFileRoute } from "@tanstack/react-router";

// Redirect legacy catalog PDF URL to the new "Product of the Week" landing.
export const Route = createFileRoute("/catalogo-allforall.pdf")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 301,
          headers: { Location: "/producto-de-la-semana" },
        }),
    },
  },
});
