export const CROP_PRESETS = [
  { id: 'square', label: 'Square (1:1)', aspect: 1 },
  { id: 'portrait', label: 'Portrait (4:5)', aspect: 4 / 5 },
  { id: 'landscape', label: 'Landscape (16:9)', aspect: 16 / 9 },
];

export const QUALITY_PRESETS = [
  { id: 'standard', label: 'Standard', longEdge: 512, jpegQuality: 0.86 },
  { id: 'high', label: 'High', longEdge: 1024, jpegQuality: 0.92 },
  { id: 'ultra', label: 'Ultra', longEdge: 1536, jpegQuality: 0.96 },
];

function computeCenteredCropRect(imgW, imgH, aspect) {
  // aspect = width/height
  let cropW = imgW;
  let cropH = imgH;
  const imgAspect = imgW / imgH;
  if (imgAspect > aspect) {
    // too wide -> limit width
    cropW = imgH * aspect;
  } else {
    // too tall -> limit height
    cropH = imgW / aspect;
  }
  const x = (imgW - cropW) / 2;
  const y = (imgH - cropH) / 2;
  return { x, y, w: cropW, h: cropH };
}

function computeOutputSize(aspect, longEdge) {
  if (aspect >= 1) {
    const w = longEdge;
    const h = Math.round(longEdge / aspect);
    return { w, h };
  }
  const h = longEdge;
  const w = Math.round(longEdge * aspect);
  return { w, h };
}

export async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportCroppedJpegBlob({
  file,
  aspect,
  zoom = 1,
  longEdge = 1024,
  jpegQuality = 0.92,
}) {
  const img = await fileToImage(file);
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  const base = computeCenteredCropRect(imgW, imgH, aspect);
  const z = Math.max(1, Number(zoom) || 1);
  const cropW = base.w / z;
  const cropH = base.h / z;
  const cropX = base.x + (base.w - cropW) / 2;
  const cropY = base.y + (base.h - cropH) / 2;

  const { w: outW, h: outH } = computeOutputSize(aspect, longEdge);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', jpegQuality);
  });
  if (!blob) throw new Error('Could not export image');
  return blob;
}

export async function previewDataUrlFromCrop(opts) {
  const blob = await exportCroppedJpegBlob(opts);
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

