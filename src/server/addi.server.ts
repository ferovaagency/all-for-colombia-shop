// Server-only Addi API client (sandbox/production)
// Docs: https://developers.addi.com

const SANDBOX_BASE = "https://channels.sandbox.addi.com";
const PROD_BASE = "https://channels.addi.com";

function getBase() {
  return (process.env.ADDI_ENV || "sandbox") === "production" ? PROD_BASE : SANDBOX_BASE;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAddiToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const clientId = process.env.ADDI_CLIENT_ID;
  const clientSecret = process.env.ADDI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Addi credentials not configured");
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${getBase()}/v1/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Addi auth failed: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export type AddiApplicationInput = {
  orderId: string;
  totalCop: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document?: string;
  };
  items: Array<{ name: string; quantity: number; price: number; sku?: string }>;
  shippingAddress?: { address: string; city: string };
  callbackUrl: string;
};

export async function createAddiApplication(input: AddiApplicationInput) {
  const token = await getAddiToken();
  const [firstName, ...rest] = input.customer.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const body = {
    allyReference: input.orderId,
    totalAmount: { value: Math.round(input.totalCop), currency: "COP" },
    callbackUrl: input.callbackUrl,
    items: input.items.map((it) => ({
      sku: it.sku || it.name.slice(0, 32),
      name: it.name,
      quantity: it.quantity,
      unitPrice: { value: Math.round(it.price), currency: "COP" },
    })),
    shopper: {
      firstName,
      lastName,
      email: input.customer.email,
      phoneNumber: input.customer.phone,
      ...(input.customer.document ? { document: { type: "CC", number: input.customer.document } } : {}),
    },
    ...(input.shippingAddress
      ? {
          shipping: {
            address: input.shippingAddress.address,
            city: input.shippingAddress.city,
            country: "CO",
          },
        }
      : {}),
  };

  const res = await fetch(`${getBase()}/v1/applications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Addi createApplication failed: ${res.status} ${text}`);
  }
  const data = JSON.parse(text) as {
    applicationId: string;
    redirectUrl?: string;
    status?: string;
  };
  return {
    applicationId: data.applicationId,
    redirectUrl: data.redirectUrl,
    status: data.status,
  };
}

export async function getAddiApplication(applicationId: string) {
  const token = await getAddiToken();
  const res = await fetch(`${getBase()}/v1/applications/${applicationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Addi getApplication ${res.status}`);
  return res.json();
}
