const SALT = "alzeena-customer-v1";

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}|${SALT}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const candidate = await hashPassword(password);
  return candidate === hash;
}
