// Ký/kiểm phiên đăng nhập bằng HMAC-SHA256 qua Web Crypto — chạy được cả trong
// proxy (Edge) lẫn Server Action (Node). Cookie = "<hết-hạn-ms>.<chữ-ký>".
// Không lưu gì nhạy cảm trong cookie; chỉ chứng minh "đã nhập đúng mật khẩu".

const enc = new TextEncoder();

function toB64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(str: string): ArrayBuffer {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export const SESSION_COOKIE = "vdc_session";

// Tạo token hợp lệ trong `ttlMs` mili-giây (mặc định 30 ngày).
export async function signSession(secret: string, ttlMs = 30 * 864e5): Promise<string> {
  const payload = String(Date.now() + ttlMs);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${toB64Url(sig)}`;
}

export async function verifySession(secret: string, token?: string): Promise<boolean> {
  if (!secret || !token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64Url(token.slice(dot + 1)),
      enc.encode(payload)
    );
  } catch {
    return false;
  }
}
