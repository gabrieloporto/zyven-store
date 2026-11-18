import crypto from 'crypto';

const MAGIC_HEADER = Buffer.from('ZYVENBKP1', 'ascii');
const PBKDF2_ITERATIONS = 120_000;
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedBackupEnvelope {
  encryptedBuffer: Buffer;
  plaintextSha256: string;
}

/**
 * Cifra un backup de base de datos o paquete de archivos con AES-256-GCM autenticado
 * derivado mediante PBKDF2-SHA256 (Sección 17).
 */
export function encryptBackupPayload(
  plaintext: Buffer,
  passphrase: string
): EncryptedBackupEnvelope {
  if (!passphrase || passphrase.length < 16) {
    throw new Error(
      'La clave de cifrado de backup (BACKUP_ENCRYPTION_KEY) debe tener al menos 16 caracteres.'
    );
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const plaintextSha256 = crypto
    .createHash('sha256')
    .update(plaintext)
    .digest('hex');

  const encryptedBuffer = Buffer.concat([
    MAGIC_HEADER,
    salt,
    iv,
    authTag,
    ciphertext,
  ]);

  return {
    encryptedBuffer,
    plaintextSha256,
  };
}

/**
 * Descifra y verifica la autenticidad e integridad de un backup cifrado de Zyven Store.
 */
export function decryptAndVerifyBackupPayload(
  encryptedBuffer: Buffer,
  passphrase: string
): { plaintext: Buffer; sha256: string } {
  const minLength = MAGIC_HEADER.byteLength + 16 + 12 + 16;
  if (encryptedBuffer.byteLength < minLength) {
    throw new Error('Archivo de backup cifrado truncado o inválido.');
  }

  const header = encryptedBuffer.subarray(0, MAGIC_HEADER.byteLength);
  if (!header.equals(MAGIC_HEADER)) {
    throw new Error('Encabezado de archivo de backup no reconocido.');
  }

  let offset = MAGIC_HEADER.byteLength;
  const salt = encryptedBuffer.subarray(offset, offset + 16);
  offset += 16;
  const iv = encryptedBuffer.subarray(offset, offset + 12);
  offset += 12;
  const authTag = encryptedBuffer.subarray(offset, offset + 16);
  offset += 16;
  const ciphertext = encryptedBuffer.subarray(offset);

  const key = crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const sha256 = crypto.createHash('sha256').update(plaintext).digest('hex');

  return { plaintext, sha256 };
}
