/**
 * `photo` from API is a path like `/uploads/filename.jpg` (served by backend / Vite proxy in dev).
 */
export function itemPhotoSrc(photo) {
  if (!photo || typeof photo !== 'string') return null;
  const t = photo.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return t.startsWith('/') ? t : `/${t}`;
}

export function publicFileSrc(pathLike) {
  return itemPhotoSrc(pathLike);
}
