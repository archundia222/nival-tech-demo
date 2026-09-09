import { createSign } from "node:crypto";

interface LoyaltyCard {
  token: string;
  businessName: string;
  customerName: string;
  points: number;
  visits: number;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function privateKey() {
  return requiredEnvironmentVariable("GOOGLE_WALLET_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function signJwt(claims: Record<string, unknown>) {
  const header = { alg: "RS256", typ: "JWT" };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  return `${unsignedToken}.${base64Url(signer.sign(privateKey()))}`;
}

function objectId(token: string) {
  const issuerId = requiredEnvironmentVariable("GOOGLE_WALLET_ISSUER_ID");
  const suffix = `customer_${token}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${issuerId}.${suffix}`;
}

export function createGoogleWalletJwt(card: LoyaltyCard, origin: string) {
  const issuerId = requiredEnvironmentVariable("GOOGLE_WALLET_ISSUER_ID");
  const classSuffix = requiredEnvironmentVariable("GOOGLE_WALLET_CLASS_SUFFIX");
  const serviceAccountEmail = requiredEnvironmentVariable("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL");

  return signJwt({
    iss: serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [origin],
    payload: {
      loyaltyObjects: [
        {
          id: objectId(card.token),
          classId: `${issuerId}.${classSuffix}`,
          state: "ACTIVE",
          accountId: card.token,
          accountName: card.customerName,
          loyaltyPoints: {
            balance: { string: String(card.points) },
            label: "Puntos",
          },
          barcode: {
            type: "QR_CODE",
            value: `${origin}/card/${encodeURIComponent(card.token)}`,
            alternateText: `${card.visits} visitas`,
          },
          textModulesData: [
            { id: "visits", header: "Visitas", body: String(card.visits) },
            { id: "business", header: "Negocio", body: card.businessName },
          ],
        },
      ],
    },
  });
}

async function googleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: requiredEnvironmentVariable("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL"),
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google OAuth failed with status ${response.status}`);
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth did not return an access token");
  return data.access_token;
}

export async function syncGoogleWalletObject(card: LoyaltyCard) {
  const accessToken = await googleAccessToken();
  const id = objectId(card.token);
  const response = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(id)}?updateMask=loyaltyPoints,textModulesData,barcode`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        loyaltyPoints: {
          balance: { string: String(card.points) },
          label: "Puntos",
        },
        barcode: {
          type: "QR_CODE",
          value: card.token,
          alternateText: `${card.visits} visitas`,
        },
        textModulesData: [
          { id: "visits", header: "Visitas", body: String(card.visits) },
          { id: "business", header: "Negocio", body: card.businessName },
        ],
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Google Wallet sync failed with status ${response.status}`);
}
