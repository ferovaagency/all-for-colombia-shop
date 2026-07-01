/**
 * Shared helper for Openpay sandbox requests.
 * Uses HTTP Basic Auth with the Private Key as the username and empty password.
 */
function getOpenpayBase() {
  const sandbox = (process.env.OPENPAY_SANDBOX ?? "true").toLowerCase() !== "false";
  return sandbox ? "https://sandbox-api.openpay.co/v1" : "https://api.openpay.co/v1";
}

export interface OpenpayEnv {
  merchantId: string;
  privateKey: string;
}

export function getOpenpayEnv(): OpenpayEnv {
  const merchantId = process.env.OPENPAY_MERCHANT_ID;
  const privateKey = process.env.OPENPAY_PRIVATE_KEY;
  if (!merchantId || !privateKey) {
    throw new Response(
      JSON.stringify({
        error_code: "missing_credentials",
        description:
          "OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY deben estar configurados en el backend.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  return { merchantId, privateKey };
}

export function basicAuthHeader(privateKey: string) {
  // Openpay: private key as username, empty password.
  const token = btoa(`${privateKey}:`);
  return `Basic ${token}`;
}

export async function openpayFetch(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<Response> {
  const { merchantId, privateKey } = getOpenpayEnv();
  const url = `${OPENPAY_BASE}/${merchantId}${path}`;
  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(privateKey),
    Accept: "application/json",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(url, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/**
 * Reads an Openpay response and returns a normalized JSON Response for the
 * frontend. If Openpay returns an error payload, forward its http_code and
 * error_code so the client can react appropriately.
 */
export async function passthroughOpenpayError(res: Response): Promise<Response> {
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = { description: await res.text().catch(() => "Unknown error") };
  }
  return new Response(
    JSON.stringify({
      error_code: payload?.error_code ?? "openpay_error",
      http_code: payload?.http_code ?? res.status,
      description: payload?.description ?? "Openpay rejected the request",
      request_id: payload?.request_id,
    }),
    {
      status: res.status || 502,
      headers: { "Content-Type": "application/json" },
    },
  );
}
