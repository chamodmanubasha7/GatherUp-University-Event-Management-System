import crypto from 'crypto';

/**
 * HMAC-SHA256 over canonical JSON (sorted keys) using JWT_SECRET.
 * Payload must NOT include `sig` — only { ticketId, eventId, userId, issuedAt }.
 */
export function signTicketPayload(payloadWithoutSig) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const canonical = JSON.stringify(payloadWithoutSig, Object.keys(payloadWithoutSig).sort());
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return { canonical, signature };
}

export function verifyTicketPayload(payloadWithoutSig, signatureHex) {
  if (!signatureHex || typeof signatureHex !== 'string') return false;
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const canonical = JSON.stringify(payloadWithoutSig, Object.keys(payloadWithoutSig).sort());
  const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHex, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
