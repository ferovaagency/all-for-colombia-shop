import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/openpay/public-config
 * Returns non-secret public config used to init Openpay.js in the browser
 * (merchant id + public key + sandbox flag). The private key never appears here.
 */
export const Route = createFileRoute("/api/openpay/public-config")({
  server: {
    handlers: {
      GET: async () => {
        const merchantId = process.env.OPENPAY_MERCHANT_ID;
        const publicKey = process.env.OPENPAY_PUBLIC_KEY;
        const sandbox = (process.env.OPENPAY_SANDBOX ?? "true").toLowerCase() !== "false";
        if (!merchantId || !publicKey) {
          return Response.json(
            {
              error_code: "missing_public_config",
              description:
                "OPENPAY_MERCHANT_ID y OPENPAY_PUBLIC_KEY deben estar configurados como secretos.",
            },
            { status: 500 },
          );
        }
        return Response.json({ merchantId, publicKey, sandbox });
      },
    },
  },
});
