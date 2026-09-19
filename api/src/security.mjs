import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as safeHttpFetch } from "undici";
export const random = () => randomBytes(32).toString("base64url");
export const hash = (s) => createHash("sha256").update(s).digest("hex");
export function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password, value = "") {
  try {
    if (typeof password !== "string" || password.length > 128) return false;
    const [salt, stored] = value.split(":");
    const expected = Buffer.from(stored, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export function encrypt(value) {
  if (!value) return "";
  const key = Buffer.from(process.env.QWIK_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("Encryption is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  return `${iv.toString("hex")}:${Buffer.concat([cipher.update(value, "utf8"), cipher.final()]).toString("hex")}:${cipher.getAuthTag().toString("hex")}`;
}
export function decrypt(value) {
  if (!value) return "";
  const [iv, content, tag] = value.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.QWIK_ENCRYPTION_KEY, "hex"),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(content, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
export function isPublicIP(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      ip === "168.63.129.16" ||
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(ip) === 6) {
    const s = ip.toLowerCase();
    return s.startsWith("2") || s.startsWith("3");
  }
  return false;
}
export async function publicFetch(url, options = {}) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw Object.assign(new Error("Use a public HTTPS endpoint on port 443."), {
      status: 400,
    });
  const addresses = await lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicIP(a.address)))
    throw Object.assign(
      new Error(
        "Private and local network endpoints are only supported by the CLI.",
      ),
      { status: 400 },
    );
  const chosen = addresses[0];
  const dispatcher = new Agent({
    connect: {
      lookup: (_h, _opts, cb) => {
        if (_opts.all) cb(null, [chosen]);
        else cb(null, chosen.address, chosen.family);
      },
    },
  });
  try {
    const r = await safeHttpFetch(u, {
      ...options,
      redirect: "error",
      dispatcher,
      signal: AbortSignal.timeout(22000),
    });
    const chunks = [];
    let size = 0;
    for await (const chunk of r.body) {
      size += chunk.length;
      if (size > 2000000) throw new Error("Provider response too large");
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString("utf8");
    return new Response(content, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
      },
    });
  } finally {
    await dispatcher.close();
  }
}
