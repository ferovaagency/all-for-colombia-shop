import { createFileRoute } from "@tanstack/react-router";
import { getOpenpayEnv, getOpenpayBase } from "@/server/openpay.server";

/**
 * GET /api/openpay/diagnostico
 * Diagnostic endpoint to check Openpay configuration
 */
export const Route = createFileRoute("/api/openpay/diagnostico")({
  server: {
    handlers: {
      GET: async () => {
        const diagnostics: any = {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        };

        // Check environment variables
        diagnostics.env_vars = {
          OPENPAY_MERCHANT_ID: process.env.OPENPAY_MERCHANT_ID ? {
            configured: true,
            value: process.env.OPENPAY_MERCHANT_ID.substring(0, 8) + "...",
            is_placeholder: process.env.OPENPAY_MERCHANT_ID.includes("your_") || process.env.OPENPAY_MERCHANT_ID === "your_merchant_id_here"
          } : { configured: false },
          OPENPAY_PRIVATE_KEY: process.env.OPENPAY_PRIVATE_KEY ? {
            configured: true,
            value: process.env.OPENPAY_PRIVATE_KEY.substring(0, 10) + "...",
            is_placeholder: process.env.OPENPAY_PRIVATE_KEY.includes("your_") || process.env.OPENPAY_PRIVATE_KEY === "sk_your_private_key_here",
            starts_with_sk: process.env.OPENPAY_PRIVATE_KEY.startsWith("sk_")
          } : { configured: false },
          OPENPAY_PUBLIC_KEY: process.env.OPENPAY_PUBLIC_KEY ? {
            configured: true,
            value: process.env.OPENPAY_PUBLIC_KEY.substring(0, 10) + "...",
            is_placeholder: process.env.OPENPAY_PUBLIC_KEY.includes("your_") || process.env.OPENPAY_PUBLIC_KEY === "pk_your_public_key_here",
            starts_with_pk: process.env.OPENPAY_PUBLIC_KEY.startsWith("pk_")
          } : { configured: false },
          OPENPAY_SANDBOX: process.env.OPENPAY_SANDBOX,
        };

        // Check base URL
        diagnostics.api_config = {
          sandbox_mode: process.env.OPENPAY_SANDBOX?.trim() === "true",
          base_url: getOpenpayBase(),
        };

        // Try to validate configuration
        try {
          const env = getOpenpayEnv();
          diagnostics.config_validation = {
            valid: true,
            merchant_id: env.merchantId,
            private_key_prefix: env.privateKey.substring(0, 10) + "...",
          };
        } catch (error: any) {
          diagnostics.config_validation = {
            valid: false,
            error: error?.message || "Unknown error",
          };
        }

        // Overall status
        const hasPlaceholders = Object.values(diagnostics.env_vars).some((v: any) => v.is_placeholder);
        const allConfigured = Object.values(diagnostics.env_vars).every((v: any) => v.configured);

        diagnostics.overall_status = {
          ready: !hasPlaceholders && allConfigured && diagnostics.config_validation.valid,
          has_placeholders: hasPlaceholders,
          all_configured: allConfigured,
          message: hasPlaceholders
            ? "Las credenciales de Openpay tienen valores placeholder. Por favor actualiza el archivo .env con tus credenciales reales."
            : allConfigured && diagnostics.config_validation.valid
            ? "Configuración de Openpay parece correcta."
            : "Faltan credenciales de Openpay o hay errores de configuración.",
        };

        return Response.json(diagnostics);
      },
    },
  },
});