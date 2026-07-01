import { createFileRoute } from "@tanstack/react-router";
import { getOpenpayEnv, getOpenpayBase, basicAuthHeader } from "@/server/openpay.server";
// Load environment variables from .env file
import '../../../../server-env';

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
            value: process.env.OPENPAY_MERCHANT_ID,
            is_placeholder: process.env.OPENPAY_MERCHANT_ID.includes("your_") || process.env.OPENPAY_MERCHANT_ID === "your_merchant_id_here"
          } : { configured: false },
          OPENPAY_PRIVATE_KEY: process.env.OPENPAY_PRIVATE_KEY ? {
            configured: true,
            value: process.env.OPENPAY_PRIVATE_KEY,
            is_placeholder: process.env.OPENPAY_PRIVATE_KEY.includes("your_") || process.env.OPENPAY_PRIVATE_KEY === "sk_your_private_key_here",
            starts_with_sk: process.env.OPENPAY_PRIVATE_KEY.startsWith("sk_")
          } : { configured: false },
          OPENPAY_PUBLIC_KEY: process.env.OPENPAY_PUBLIC_KEY ? {
            configured: true,
            value: process.env.OPENPAY_PUBLIC_KEY,
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

        // Test actual API call
        diagnostics.api_test = {
          attempted: false,
          success: false,
          error: null,
          response: null,
        };

        if (diagnostics.config_validation.valid) {
          try {
            const { merchantId, privateKey } = getOpenpayEnv();
            const baseUrl = getOpenpayBase();
            const testUrl = `${baseUrl}/v1/${merchantId}/banks/pse`;
            const authHeader = basicAuthHeader(privateKey);

            diagnostics.api_test.attempted = true;
            diagnostics.api_test.url = testUrl;
            diagnostics.api_test.auth_header_prefix = authHeader.substring(0, 30) + "...";

            const response = await fetch(testUrl, {
              method: "GET",
              headers: {
                Authorization: authHeader,
                Accept: "application/json",
              },
            });

            diagnostics.api_test.status = response.status;
            diagnostics.api_test.status_text = response.statusText;

            const responseText = await response.text();
            diagnostics.api_test.response_body = responseText;

            if (response.ok) {
              diagnostics.api_test.success = true;
              try {
                const data = JSON.parse(responseText);
                diagnostics.api_test.parsed_response = data;
              } catch {
                diagnostics.api_test.parse_error = "Could not parse JSON";
              }
            } else {
              diagnostics.api_test.success = false;
              diagnostics.api_test.error = `HTTP ${response.status}: ${response.statusText}`;
              try {
                const errorData = JSON.parse(responseText);
                diagnostics.api_test.error_details = errorData;
              } catch {
                // Keep raw response
              }
            }
          } catch (error: any) {
            diagnostics.api_test.attempted = true;
            diagnostics.api_test.success = false;
            diagnostics.api_test.error = error?.message || "Unknown error";
            diagnostics.api_test.error_details = String(error);
          }
        }

        // Overall status
        const hasPlaceholders = Object.values(diagnostics.env_vars).some((v: any) => v.is_placeholder);
        const allConfigured = Object.values(diagnostics.env_vars).every((v: any) => v.configured);

        diagnostics.overall_status = {
          ready: !hasPlaceholders && allConfigured && diagnostics.config_validation.valid && diagnostics.api_test.success,
          has_placeholders: hasPlaceholders,
          all_configured: allConfigured,
          config_valid: diagnostics.config_validation.valid,
          api_working: diagnostics.api_test.success,
          message: hasPlaceholders
            ? "Las credenciales de Openpay tienen valores placeholder. Por favor actualiza el archivo .env con tus credenciales reales."
            : !allConfigured
            ? "Faltan credenciales de Openpay."
            : !diagnostics.config_validation.valid
            ? "Hay errores en la configuración de Openpay."
            : !diagnostics.api_test.success
            ? "La configuración parece correcta pero la API de Openpay está rechazando las solicitudes. Verifica que las credenciales sean correctas."
            : "Configuración de Openpay correcta y API funcionando.",
        };

        return Response.json(diagnostics);
      },
    },
  },
});