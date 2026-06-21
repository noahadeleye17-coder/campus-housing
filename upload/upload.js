const multer = require("multer");

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image") || file.mimetype.startsWith("video")) {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"), false);
  }
};

// Memory storage: the file stays as a buffer in req.file.buffer instead of
// being written to disk immediately. This lets the resizeImage middleware
// (run right after this) process images with Sharp, and pass videos
// straight through to disk untouched.
module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB — large enough for short apartment video clips
  },
});