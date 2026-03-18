import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT = "bc-booking-agent-vault-v1"; // Static salt — key entropy comes from master key

function getDerivedKey(): Buffer {
  const masterKey = process.env.VAULT_MASTER_KEY;
  if (!masterKey || masterKey.includes("change_me")) {
    throw new Error(
      "VAULT_MASTER_KEY is not set. Generate a random 64-char hex string and set it in .env.local"
    );
  }
  return pbkdf2Sync(masterKey, SALT, 100_000, KEY_LENGTH, "sha256");
}

export interface EncryptedData {
  ciphertext: Buffer;
  iv: Buffer;
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Append auth tag to ciphertext
  return {
    ciphertext: Buffer.concat([encrypted, authTag]),
    iv,
  };
}

export function decrypt(ciphertext: Buffer, iv: Buffer): string {
  const key = getDerivedKey();

  // Extract auth tag from end of ciphertext
  const authTag = ciphertext.subarray(ciphertext.length - AUTH_TAG_LENGTH);
  const encryptedData = ciphertext.subarray(
    0,
    ciphertext.length - AUTH_TAG_LENGTH
  );

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return decipher.update(encryptedData) + decipher.final("utf8");
}

/** Encrypt multiple fields with a shared IV */
export function encryptFields(
  fields: Record<string, string>
): { encrypted: Record<string, Buffer>; iv: Buffer } {
  const iv = randomBytes(IV_LENGTH);
  const key = getDerivedKey();
  const encrypted: Record<string, Buffer> = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    encrypted[fieldName] = Buffer.concat([enc, authTag]);
  }

  return { encrypted, iv };
}

/** Decrypt multiple fields that share an IV */
export function decryptFields(
  fields: Record<string, Buffer>,
  iv: Buffer
): Record<string, string> {
  const key = getDerivedKey();
  const decrypted: Record<string, string> = {};

  for (const [fieldName, ciphertext] of Object.entries(fields)) {
    const authTag = ciphertext.subarray(ciphertext.length - AUTH_TAG_LENGTH);
    const encryptedData = ciphertext.subarray(
      0,
      ciphertext.length - AUTH_TAG_LENGTH
    );
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    decrypted[fieldName] =
      decipher.update(encryptedData) + decipher.final("utf8");
  }

  return decrypted;
}
