import crypto from 'crypto';

/** Short human-friendly IDs like LF-ABC123 / FI-XYZ789 */
export function makePublicId(prefix) {
  const buf = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${buf}`;
}
