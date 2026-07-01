// Server-only Addi API client (sandbox/production)
// Docs: https://developers.addi.com

const PUBLIC_API_PROD = "https://channels-public-api.addi.com";
const PUBLIC_API_SANDBOX = "https://channels-public-api.addi-staging.com";
const APPLICATION_API_PROD = "https://api.addi.com";
const APPLICATION_API_SANDBOX = "https://api.addi-staging.com";
const AUTH_PROD = "https://auth.addi.com";
const AUTH_SANDBOX = "https://auth.addi-staging.com";
const AUDIENCE_PROD = "https://api.addi.com";
const AUDIENCE_SANDBOX = "https://api.staging.addi.com";

function isProduction() {
  return (process.env.ADDI_ENV || "sandbox") === "production";
}

function getAuthBase() {
  return isProduction() ? AUTH_PROD : AUTH_SANDBOX;
}

function getAudience() {
  return isProduction() ? AUDIENCE_PROD : AUDIENCE_SANDBOX;
}

function getPublicApiBase() {
  return isProduction() ? PUBLIC_API_PROD : PUBLIC_API_SANDBOX;
}

function getApplicationApiBase() {
  return isProduction() ? APPLICATION_API_PROD : APPLICATION_API_SANDBOX;
}

function getAllySlug() {
  const slug = process.env.ADDI_ALLY_SLUG;
  if (!slug) throw new Error("ADDI_ALLY_SLUG not configured");
  return slug;
}

/**
 * OAuth client_credentials against auth.addi(-staging).com/oauth/token.
 * Per Addi best practice, we do NOT cache the token — generate a fresh
 * one per transaction attempt.
 */
export async function getAddiToken(): Promise<string> {
  const clientId = process.env.ADDI_CLIENT_ID?.trim();
  const clientSecret = process.env.ADDI_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Addi credentials not configured (ADDI_CLIENT_ID/ADDI_CLIENT_SECRET)");
  }

  const res = await fetch(`${getAuthBase()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      audience: getAudience(),
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Addi auth failed: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  return data.access_token;
}

/**
 * GET /allies/:slug/config?requestedamount=xxxx
 * Public endpoint (no auth) — returns availability + min/max + discount.
 */
export type AddiConfig = {
  minAmount: number;
  maxAmount: number;
  policy?: {
    discount?: number;
    productType?: string;
    policyMaxAmount?: number;
    isVisible?: boolean;
  };
  widgetConfig?: Record<string, any>;
  checkoutConfig?: Record<string, any>;
  isActiveAlly: boolean;
  isActivePayNow: boolean;
};

export async function getAddiConfig(requestedAmountCop: number): Promise<AddiConfig> {
  const slug = getAllySlug();
  const url = `${getPublicApiBase()}/allies/${encodeURIComponent(slug)}/config?requestedamount=${Math.round(requestedAmountCop)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Addi config failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as AddiConfig;
}

export type AddiApplicationInput = {
  orderId: string;
  totalCop: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document?: string;
    document_type?: string;
    document_number?: string;
  };
  items: Array<{ name: string; quantity: number; price: number; sku?: string }>;
  shippingAddress?: { address: string; city: string };
  callbackUrl: string;
  redirectionUrl: string;
  logoUrl?: string;
};

/**
 * POST /v1/online-applications
 * Addi returns HTTP 301 with Location header pointing at the checkout URL.
 * We disable auto-follow so we can capture the redirect target reliably.
 */
export async function createAddiApplication(input: AddiApplicationInput) {
  const token = await getAddiToken();
  const [firstName, ...rest] = (input.customer.name || "").trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName || "";
  const documentNumber = String(
    input.customer.document_number || input.customer.document || "",
  ).replace(/[^\d]/g, "");
  const shipping = {
    lineOne: input.shippingAddress?.address || "Dirección no especificada",
    city: input.shippingAddress?.city || "Bogotá D.C",
    country: "CO",
  };
  const logoUrl =
    input.logoUrl || `${new URL(input.redirectionUrl).origin}/favicon.ico`;

  const body = {
    orderId: input.orderId,
    totalAmount: Math.round(input.totalCop),
    shippingAmount: 0,
    totalTaxesAmount: 0,
    currency: "COP",
    items: input.items.map((it) => ({
      sku: it.sku || it.name.slice(0, 32),
      name: it.name,
      quantity: it.quantity,
      unitPrice: Math.round(it.price),
      tax: 0,
      pictureUrl: "https://allforall.com.co/favicon.ico",
      category: "technology",
    })),
    client: {
      idType: input.customer.document_type || "CC",
      idNumber: documentNumber,
      firstName,
      lastName,
      email: input.customer.email,
      cellphone: String(input.customer.phone || "").replace(/[^\d]/g, ""),
      cellphoneCountryCode: "+57",
      address: shipping,
    },
    shippingAddress: shipping,
    billingAddress: shipping,
    allyUrlRedirection: {
      logoUrl,
      callbackUrl: input.callbackUrl,
      redirectionUrl: input.redirectionUrl,
    },
  };

  const res = await fetch(`${getApplicationApiBase()}/v1/online-applications`, {
    method: "POST",
    redirect: "manual", // capture the 301 ourselves
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  // Success: Addi replies 301 with Location header, no body.
  if (res.status === 301 || res.status === 302) {
    const redirectUrl = res.headers.get("location");
    if (!redirectUrl) {
      throw new Error("Addi returned redirect without Location header");
    }
    // applicationId can sometimes be found in the URL query; fall back to orderId.
    let applicationId = input.orderId;
    try {
      const u = new URL(redirectUrl);
      const idFromUrl =
        u.searchParams.get("applicationId") ||
        u.searchParams.get("application_id") ||
        u.pathname.split("/").filter(Boolean).pop();
      if (idFromUrl) applicationId = idFromUrl;
    } catch {
      /* ignore */
    }
    return { applicationId, redirectUrl, status: "PENDING" as const };
  }

  // Some environments return 200 with a JSON body — handle it defensively.
  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      applicationId?: string;
      redirectUrl?: string;
      status?: string;
    };
    if (!data.redirectUrl) {
      throw new Error(`Addi createApplication ok but missing redirectUrl: ${JSON.stringify(data)}`);
    }
    return {
      applicationId: data.applicationId || input.orderId,
      redirectUrl: data.redirectUrl,
      status: data.status || "PENDING",
    };
  }

  const text = await res.text();
  throw new Error(`Addi createApplication failed: ${res.status} ${text}`);
}

export async function getAddiApplication(applicationId: string) {
  const token = await getAddiToken();
  const res = await fetch(
    `${getApplicationApiBase()}/v1/online-applications/${encodeURIComponent(applicationId)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Addi getApplication ${res.status}`);
  return res.json();
}

/**
 * POST cancellation. Amount equal to original = full cancellation;
 * lesser amount = partial. Only ONE cancellation call is allowed per app.
 */
export async function cancelAddiApplication(
  applicationId: string,
  amountCop: number,
  reason?: string,
) {
  const token = await getAddiToken();
  const res = await fetch(
    `${getApplicationApiBase()}/v1/online-applications/${encodeURIComponent(applicationId)}/cancellations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: { value: Math.round(amountCop), currency: "COP" },
        ...(reason ? { reason } : {}),
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Addi cancel failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : { ok: true };
}
