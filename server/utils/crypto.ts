import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'; // 32 chars
const IV_LENGTH = 16; // For GCM, this is always 16

/**
 * Encrypt text using AES-256-GCM
 */
export function encrypt (text: string): string {
  if (!text) {
    return '';
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher(ALGORITHM, SECRET_KEY);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return `${iv.toString('hex')  }:${  authTag.toString('hex')  }:${  encrypted}`;
}

/**
 * Decrypt text using AES-256-GCM
 */
export function decrypt (encryptedText: string): string {
  if (!encryptedText) {
    return '';
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(ALGORITHM, SECRET_KEY);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash text using SHA-256
 */
export function hash (text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate random string
 */
export function generateRandomString (length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
