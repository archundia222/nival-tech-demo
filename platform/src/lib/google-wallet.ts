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

export function createGoogleWalletJwt(card: LoyaltyCard, origin: string) {
  const issuerId = requiredEnvironmentVariable("GOOGLE_WALLET_ISSUER_ID");
  const classSuffix = requiredEnvironmentVariable("GOOGLE_WALLET_CLASS_SUFFIX");
  const serviceAccountEmail = requiredEnvironmentVariable("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requiredEnvironmentVariable("GOOGLE_WALLET_PRIVATE_KEY").replace(/\\n/g, "\n");
  const objectSuffix = `customer_${card.token}`.replace(/[^a-zA-Z0-9._-]/g, "_");

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [origin],
    payload: {
      loyaltyObjects: [
        {
          id: `${issuerId}.${objectSuffix}`,
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
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${base64Url(signer.sign(privateKey))}`;
}
