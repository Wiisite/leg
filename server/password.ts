import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function isHashedPassword(value: string): boolean {
  return value.startsWith(`${PREFIX}:`);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return `${PREFIX}:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;

  if (!isHashedPassword(stored)) {
    // Senha legada em texto plano: compara diretamente para não quebrar
    // contas existentes. O chamador deve re-hashear após um match legado.
    return plain === stored;
  }

  const [, salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const storedKey = Buffer.from(hashHex, "hex");
  const derivedKey = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}
