import http2 from "http2";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { db } from "./supabaseAdmin";

const APNS_HOST = "https://api.push.apple.com";

let cachedToken: { token: string; issuedAt: number } | null = null;

function getApnsToken(): string {
  const now = Date.now();
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60 * 1000) return cachedToken.token;
  const token = jwt.sign({}, config.apple.apnsKey(), {
    algorithm: "ES256",
    issuer: config.apple.teamId,
    header: { alg: "ES256", kid: config.apple.apnsKeyId },
  });
  cachedToken = { token, issuedAt: now };
  return token;
}

function pushToDevice(client: http2.ClientHttp2Session, pushToken: string): Promise<number> {
  return new Promise((resolve) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      authorization: `bearer ${getApnsToken()}`,
      "apns-topic": config.apple.passTypeId,
      "apns-push-type": "background",
    });
    let status = 0;
    req.on("response", (h) => { status = Number(h[":status"] ?? 0); });
    req.on("close", () => resolve(status));
    req.on("error", () => resolve(0));
    req.end(JSON.stringify({}));
  });
}

async function pushTokens(tokens: string[]): Promise<void> {
  if (!tokens.length) return;
  const client = http2.connect(APNS_HOST);
  try {
    for (let i = 0; i < tokens.length; i += 50) {
      await Promise.all(tokens.slice(i, i + 50).map((t) => pushToDevice(client, t)));
    }
  } finally {
    client.close();
  }
}

/** Push tous les appareils enregistrés pour UN pass. */
export async function pushPassUpdate(serialNumber: string): Promise<void> {
  const { data: regs } = await db
    .from("apple_registrations")
    .select("push_token")
    .eq("serial_number", serialNumber);
  await pushTokens((regs ?? []).map((r) => r.push_token));
}

/** Push tous les pass d'UN merchant (giga promo) — jamais toute la plateforme. */
export async function pushMerchantPasses(merchantId: string): Promise<number> {
  const { data: customers } = await db
    .from("customers")
    .select("serial_number")
    .eq("merchant_id", merchantId);

  if (!customers?.length) return 0;

  const { data: regs } = await db
    .from("apple_registrations")
    .select("push_token")
    .in("serial_number", customers.map((c) => c.serial_number));

  const tokens = [...new Set((regs ?? []).map((r) => r.push_token))];
  await pushTokens(tokens);
  return tokens.length;
}
