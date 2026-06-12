import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safe);
  },
});

const jpegPngExt = /\.(jpe?g|png)$/i;
const videoExt = /\.(mp4|webm|ogg)$/i;
const pdfExt = /\.pdf$/i;

const imageFilter = (_req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const mimeOk =
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/jpg' ||
    mime === 'image/pjpeg' ||
    mime === 'image/x-png';
  const extOk = file.mimetype === '' && jpegPngExt.test(file.originalname || '');
  if (!mimeOk && !extOk) {
    return cb(
      new Error('Please upload a JPEG or PNG image only. Other formats are not supported.')
    );
  }
  cb(null, true);
};

const eventMediaFilter = (_req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const name = file.originalname || '';

  if (file.fieldname === 'photo') {
    const mimeOk =
      mime === 'image/jpeg' ||
      mime === 'image/png' ||
      mime === 'image/jpg' ||
      mime === 'image/pjpeg' ||
      mime === 'image/x-png';
    const extOk = mime === '' && jpegPngExt.test(name);
    if (!mimeOk && !extOk) {
      return cb(new Error('Photo must be a JPEG or PNG image.'));
    }
    return cb(null, true);
  }

  if (file.fieldname === 'video') {
    const mimeOk =
      mime === 'video/mp4' ||
      mime === 'video/webm' ||
      mime === 'video/ogg' ||
      mime === 'application/octet-stream';
    const extOk = (mime === '' || mime === 'application/octet-stream') && videoExt.test(name);
    if (!mimeOk && !extOk) {
      return cb(new Error('Video must be MP4, WebM, or Ogg.'));
    }
    return cb(null, true);
  }

  if (file.fieldname === 'pdf') {
    const mimeOk = mime === 'application/pdf';
    const extOk = (mime === '' || mime === 'application/octet-stream') && pdfExt.test(name);
    if (!mimeOk && !extOk) {
      return cb(new Error('File must be a PDF.'));
    }
    return cb(null, true);
  }

  return cb(new Error('Unexpected upload field.'));
};

export const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('photo');

const uploadEventMedia = multer({
  storage,
  // Allow larger uploads for video; keep images small.
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: eventMediaFilter,
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
]);

export const uploadOptional = (req, res, next) => {
  /** JSON-only requests skip multer so express.json body stays intact */
  if (!req.is('multipart/form-data')) {
    return next();
  }
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'That file is too large. Please use a JPEG or PNG under 5 MB.',
        });
      }
      return res.status(400).json({
        message: err.message || 'Upload failed. Please use a JPEG or PNG under 5 MB.',
      });
    }
    next();
  });
};

export const uploadEventMediaOptional = (req, res, next) => {
  /** JSON-only requests skip multer so express.json body stays intact */
  if (!req.is('multipart/form-data')) {
    return next();
  }
  uploadEventMedia(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'That file is too large. Please use a video under 50 MB (and images under 5 MB).',
        });
      }
      return res.status(400).json({
        message: err.message || 'Upload failed. Please check the selected files.',
      });
    }
    next();
  });
};

/** Path segment served as static /uploads/filename */
export function getPublicUploadPath(filename) {
  return `/uploads/${filename}`;
}
