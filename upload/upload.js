const multer = require("multer");

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, MP4, MOV, and WebM uploads are allowed"), false);
  }
};

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: parsePositiveInt(process.env.UPLOAD_FILE_SIZE_LIMIT_MB, 50) * 1024 * 1024,
    files: 7,
    fields: 20,
    fieldSize: 20 * 1024,
    parts: 30,
  },
});
