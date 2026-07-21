import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const saltHex = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, saltHex, KEY_LENGTH)) as Buffer;
  return `${saltHex}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;

  const [saltHex, hashHex] = parts;
  const derivedKey = (await scryptAsync(password, saltHex, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, "hex");

  if (derivedKey.length !== storedBuffer.length) return false;
  return timingSafeEqual(derivedKey, storedBuffer);
}
