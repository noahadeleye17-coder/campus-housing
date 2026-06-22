const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sharp = require("sharp");

const uploadDir = path.join(__dirname, "..", "uploads");
const videoExtensionsByMime = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

const makeUniqueName = (ext) => `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

const deleteUploadedFile = (filename) => {
  if (!filename) return;

  const target = path.resolve(uploadDir, filename);
  if (!target.startsWith(path.resolve(uploadDir) + path.sep)) return;

  try {
    fs.unlinkSync(target);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Could not delete uploaded file:", error.message);
    }
  }
};

const cleanupProcessedMedia = (req) => {
  (req.processedImages || []).forEach(deleteUploadedFile);
  deleteUploadedFile(req.processedVideo);
};

const processImage = async (file) => {
  const uniqueName = makeUniqueName(".jpg");
  const outputPath = path.join(uploadDir, uniqueName);

  await sharp(file.buffer)
    .rotate() // auto-orient based on EXIF data (fixes sideways phone photos)
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside", // preserves aspect ratio, never crops
      withoutEnlargement: true, // don't upscale small images
    })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  return uniqueName;
};

const processVideo = (file) => {
  const ext = videoExtensionsByMime[file.mimetype];
  if (!ext) {
    throw new Error("Unsupported video type");
  }

  const uniqueName = makeUniqueName(ext);
  const outputPath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(outputPath, file.buffer);
  return uniqueName;
};

/**
 * Runs after upload.fields([{ name: "images" }, { name: "video" }]).
 *
 * req.files will look like: { images: [file, file, ...], video: [file] }
 *
 * Images are resized/compressed with Sharp (never cropped — only capped
 * to a max dimension). Video is passed straight to disk since Sharp can't
 * process it.
 *
 * Sets req.processedImages (array of filenames) and req.processedVideo
 * (filename or null) for the controller to use.
 */
const resizeImage = async (req, res, next) => {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });

    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.video || [];

    req.processedImages = [];
    req.processedVideo = null;

    for (const imageFile of imageFiles) {
      req.processedImages.push(await processImage(imageFile));
    }

    req.processedVideo = videoFiles.length ? processVideo(videoFiles[0]) : null;

    next();
  } catch (error) {
    cleanupProcessedMedia(req);
    console.error("Media processing failed:", error);
    res.status(400).json({ message: "Could not process uploaded files" });
  }
};

module.exports = resizeImage;
module.exports.cleanupProcessedMedia = cleanupProcessedMedia;
