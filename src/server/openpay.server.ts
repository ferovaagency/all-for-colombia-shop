// Load environment variables from .env file
import '../../server-env';

/**
 * Shared helper for Openpay sandbox requests.
 * Uses HTTP Basic Auth with the Private Key as the username and empty password.
 */
export function getOpenpayBase() {
  const sandbox = process.env.OPENPAY_SANDBOX?.trim() === "true";
  return sandbox ? "https://sandbox-api.openpay.co" : "https://api.openpay.co";
}

export interface OpenpayEnv {
  merchantId: string;
  privateKey: string;
}

function cleanSecret(value: string | undefined) {
  return value?.trim();
}

function openpayConfigError(description: string, status = 500): never {
  throw new Response(
    JSON.stringify({
      error_code: "openpay_config_error",
      description,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export function getOpenpayEnv(): OpenpayEnv {
  const merchantId = cleanSecret(process.env.OPENPAY_MERCHANT_ID);
  const privateKey = cleanSecret(process.env.OPENPAY_PRIVATE_KEY);
  const publicKey = cleanSecret(process.env.OPENPAY_PUBLIC_KEY);

  console.log("[Openpay Config] Merchant ID:", merchantId);
  console.log("[Openpay Config] Private Key prefix:", privateKey?.substring(0, 10) + "...");
  console.log("[Openpay Config] Public Key prefix:", publicKey?.substring(0, 10) + "...");
  console.log("[Openpay Config] Sandbox mode:", process.env.OPENPAY_SANDBOX?.trim() === "true");

  if (!merchantId || !privateKey) {
    openpayConfigError("OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY deben estar configurados en el backend.");
  }
  if (privateKey.startsWith("pk_")) {
    openpayConfigError("Las llaves de Openpay parecen estar invertidas: OPENPAY_PRIVATE_KEY contiene una llave pública (pk_). Debe contener la llave secreta (sk_).");
  }
  if (publicKey?.startsWith("sk_")) {
    openpayConfigError("Las llaves de Openpay parecen estar invertidas: OPENPAY_PUBLIC_KEY contiene una llave secreta (sk_). Debe contener la llave pública (pk_).");
  }
  if (!privateKey.startsWith("sk_")) {
    openpayConfigError("La llave privada no tiene formato sk_");
  }
  return { merchantId, privateKey };
}

export function basicAuthHeader(privateKey: string) {
  // Openpay: private key as username, empty password.
  const token = btoa(`${privateKey}:`);
  console.log("[Openpay Auth] Using Basic Auth with token prefix:", token.substring(0, 20) + "...");
  return `Basic ${token}`;
}

export async function openpayFetch(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<Response> {
  const { merchantId, privateKey } = getOpenpayEnv();
  const baseUrl = getOpenpayBase();
  const url = `${baseUrl}/v1/${merchantId}${path}`;

  console.log("[Openpay Request] URL:", url);
  console.log("[Openpay Request] Method:", init.method);
  console.log("[Openpay Request] Base URL:", baseUrl);
  console.log("[Openpay Request] Merchant ID:", merchantId);
  console.log("[Openpay Request] Path:", path);

  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(privateKey),
    Accept: "application/json",
    "Content-Type": "application/json", // Always include Content-Type
  };

  console.log("[Openpay Request] Headers:", {
    ...headers,
    Authorization: headers.Authorization.substring(0, 30) + "..."
  });

  try {
    const response = await fetch(url, {
      method: init.method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    console.log("[Openpay Response] Status:", response.status);
    console.log("[Openpay Response] Status Text:", response.statusText);

    // Log response body for debugging
    const responseText = await response.text();
    console.log("[Openpay Response] Body:", responseText);

    // Return a new Response with the original body
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[Openpay Request] Error:", error);
    throw error;
  }
}

/**
 * Reads an Openpay response and returns a normalized JSON Response for the
 * frontend. If Openpay returns an error payload, forward its http_code and
 * error_code so the client can react appropriately.
 */
export async function passthroughOpenpayError(res: Response): Promise<Response> {
  let payload: any = null;
  try {
    const text = await res.text();
    console.log("[Openpay Error] Response text:", text);
    payload = JSON.parse(text);
  } catch {
    payload = { description: await res.text().catch(() => "Unknown error") };
  }
  return new Response(
    JSON.stringify({
      error_code: payload?.error_code ?? "openpay_error",
      http_code: payload?.http_code ?? res.status,
      description: payload?.description ?? "Openpay rejected the request",
      request_id: payload?.request_id,
      debug_info: payload,
    }),
    {
      status: res.status || 502,
      headers: { "Content-Type": "application/json" },
    },
  );
}