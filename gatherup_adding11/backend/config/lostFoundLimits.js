/** Rolling 24-hour windows for Lost & Found rate limits (configurable via env). */
const MS_DAY = 24 * 60 * 60 * 1000;

export function rolling24hStart() {
  return new Date(Date.now() - MS_DAY);
}

export function maxLostFoundPostsPer24h() {
  const n = parseInt(process.env.LF_MAX_POSTS_PER_24H ?? '5', 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function maxFoundClaimsPer24h() {
  const n = parseInt(process.env.LF_MAX_CLAIMS_PER_24H ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
