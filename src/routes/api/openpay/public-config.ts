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
        const merchantId = process.env.OPENPAY_MERCHANT_ID?.trim();
        const publicKey = process.env.OPENPAY_PUBLIC_KEY?.trim();
        const privateKey = process.env.OPENPAY_PRIVATE_KEY?.trim();
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
        if (publicKey.startsWith("sk_") || privateKey?.startsWith("pk_")) {
          return Response.json(
            {
              error_code: "openpay_keys_reversed",
              description:
                "Las llaves de Openpay parecen estar invertidas: OPENPAY_PUBLIC_KEY debe ser pk_ y OPENPAY_PRIVATE_KEY debe ser sk_.",
            },
            { status: 500 },
          );
        }
        if (!publicKey.startsWith("pk_")) {
          return Response.json(
            {
              error_code: "openpay_public_key_invalid",
              description: "OPENPAY_PUBLIC_KEY debe iniciar por pk_.",
            },
            { status: 500 },
          );
        }
        return Response.json({ merchantId, publicKey, sandbox });
      },
    },
  },
});
