import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/** Salted scrypt hash, stored as `<salt-hex>:<hash-hex>`. No extra dependency needed — scrypt ships in Node's built-in crypto module and is a legitimate memory-hard KDF. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/** Never throws on a malformed/missing stored hash — just reports no match, so a corrupt or absent (OAuth-only) row safely fails login rather than crashing it. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const storedKey = Buffer.from(hashHex, "hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}
