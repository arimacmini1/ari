/**
 * Cryptographic Hash Functions for Audit Log Integrity
 * F07-MH-01: Hash chain prevents tampering using nonce + HMAC-SHA256
 * 
 * Implements:
 * - HMAC-SHA256 for hash calculation
 * - Hash chain verification
 * - Nonce generation for uniqueness
 */

import crypto from 'crypto';

/**
 * Audit log hash secret (should be stored in environment)
 * For production, use a KMS (AWS KMS, HashiCorp Vault) to rotate keys
 */
const AUDIT_LOG_SECRET = process.env.AUDIT_LOG_SECRET || 'default-insecure-secret';

/**
 * Generate a random nonce for hash uniqueness
 * Prevents replay attacks and duplicate hashes
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Calculate HMAC-SHA256 hash for an audit log entry
 * 
 * Hash input includes:
 * - Actor + Action + Resource
 * - Timestamp
 * - Context (stringified)
 * - Previous hash (for chain)
 * - Nonce (for uniqueness)
 * 
 * @param data Entry data to hash
 * @param previousHash Hash of previous entry in chain
 * @param nonce Random nonce for uniqueness
 * @returns Hex-encoded HMAC-SHA256 hash
 */
export function calculateEntryHash(
  data: {
    timestamp: string;
    actor: string;
    action: string;
    resource_type: string;
    resource_id: string;
    context: string;
  },
  previousHash: string | null,
  nonce: string
): string {
  // Build hash input string in deterministic order
  const hashInput = [
    data.timestamp,
    data.actor,
    data.action,
    data.resource_type,
    data.resource_id,
    data.context,
    previousHash || '',
    nonce,
  ].join('|');

  // Calculate HMAC-SHA256
  const hmac = crypto.createHmac('sha256', AUDIT_LOG_SECRET);
  hmac.update(hashInput);
  return hmac.digest('hex');
}

/**
 * Verify a single audit log entry hash
 * @returns true if hash is valid
 */
export function verifyEntryHash(
  data: {
    timestamp: string;
    actor: string;
    action: string;
    resource_type: string;
    resource_id: string;
    context: string;
  },
  previousHash: string | null,
  nonce: string,
  expectedHash: string
): boolean {
  const calculatedHash = calculateEntryHash(data, previousHash, nonce);
  return calculatedHash === expectedHash;
}

/**
 * Verify hash chain integrity
 * Checks that:
 * 1. Each entry's hash is valid
 * 2. Each entry's previous_hash matches previous entry's hash
 */
export function verifyHashChain(
  entries: Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    resource_type: string;
    resource_id: string;
    context: string;
    entry_hash: string;
    previous_hash: string | null;
    nonce: string;
  }>
): {
  valid: boolean;
  errors: Array<{ entryId: string; error: string }>;
} {
  const errors: Array<{ entryId: string; error: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const previousEntry = i > 0 ? entries[i - 1] : null;

    // Verify entry hash
    const isHashValid = verifyEntryHash(
      {
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        context: entry.context,
      },
      entry.previous_hash,
      entry.nonce,
      entry.entry_hash
    );

    if (!isHashValid) {
      errors.push({
        entryId: entry.id,
        error: `Invalid entry hash. Expected ${
          calculateEntryHash(
            {
              timestamp: entry.timestamp,
              actor: entry.actor,
              action: entry.action,
              resource_type: entry.resource_type,
              resource_id: entry.resource_id,
              context: entry.context,
            },
            entry.previous_hash,
            entry.nonce
          )
        }, got ${entry.entry_hash}`,
      });
    }

    // Verify chain link (except for first entry)
    if (i > 0 && previousEntry) {
      if (entry.previous_hash !== previousEntry.entry_hash) {
        errors.push({
          entryId: entry.id,
          error: `Chain broken. Previous hash mismatch at position ${i}`,
        });
      }
    } else if (i === 0 && entry.previous_hash !== null) {
      errors.push({
        entryId: entry.id,
        error: 'First entry should have null previous_hash',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the hash secret version (for key rotation tracking)
 */
export function getKeyVersion(): number {
  const version = process.env.AUDIT_LOG_KEY_VERSION || '1';
  return parseInt(version, 10);
}

/**
 * Verify hash using a specific key version (for key rotation support)
 * Useful when keys are rotated but old entries must still be verified
 */
export function verifyEntryHashWithKeyVersion(
  data: {
    timestamp: string;
    actor: string;
    action: string;
    resource_type: string;
    resource_id: string;
    context: string;
  },
  previousHash: string | null,
  nonce: string,
  expectedHash: string,
  keyVersion: number
): boolean {
  // In a real implementation, look up the old key from KMS
  // For now, we only support current key version
  if (keyVersion !== getKeyVersion()) {
    console.warn(`Key version mismatch: requested ${keyVersion}, current ${getKeyVersion()}`);
  }

  return verifyEntryHash(data, previousHash, nonce, expectedHash);
}
