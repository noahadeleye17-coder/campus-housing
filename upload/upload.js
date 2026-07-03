const sharp = require("sharp");
const { v2: cloudinary } = require("cloudinary");

// Cloudinary is configured from env vars at startup.
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//
// signature_algorithm is set to "sha256" because some Cloudinary accounts
// have a security setting that only accepts SHA-256 signatures. The SDK
// defaults to SHA-1, which causes every upload to fail with
// "Invalid Signature" even when the credentials themselves are correct.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  signature_algorithm: "sha256",
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Upload a Node.js Buffer to Cloudinary and return the secure URL.
 * We use the upload_stream API because Cloudinary's Node SDK
 * doesn't accept raw Buffers directly.
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id.
 * resource_type must match how it was uploaded ("image" or "video").
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.warn("Could not delete Cloudinary asset:", error.message);
  }
};

// ── Image processing ─────────────────────────────────────────────────────────

const processImage = async (file) => {
  // Resize/compress with Sharp — same settings as before — but output to a
  // Buffer instead of a file on disk.
  const buffer = await sharp(file.buffer)
    .rotate()                        // auto-orient from EXIF (fixes sideways phone photos)
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",                 // preserves aspect ratio, never crops
      withoutEnlargement: true,      // don't upscale small images
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  const result = await uploadBufferToCloudinary(buffer, {
    folder: "campus-housing/apartments",
    resource_type: "image",
  });

  return { url: result.secure_url, publicId: result.public_id };
};

// ── Video processing ─────────────────────────────────────────────────────────

const processVideo = async (file) => {
  // Videos are passed straight to Cloudinary without transcoding —
  // Sharp can't handle video.
  const result = await uploadBufferToCloudinary(file.buffer, {
    folder: "campus-housing/apartments",
    resource_type: "video",
  });

  return { url: result.secure_url, publicId: result.public_id };
};

// ── Cleanup helper ───────────────────────────────────────────────────────────

/**
 * Called on error to remove any assets that were already uploaded to
 * Cloudinary during a failed request.
 */
const cleanupProcessedMedia = async (req) => {
  const imageIds = req.processedImageIds || [];
  const videoId = req.processedVideoId || null;

  await Promise.all([
    ...imageIds.map((id) => deleteFromCloudinary(id, "image")),
    videoId ? deleteFromCloudinary(videoId, "video") : Promise.resolve(),
  ]);
};

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Runs after upload.fields([{ name: "images" }, { name: "video" }]).
 *
 * Sets on req:
 *   req.processedImages     — array of Cloudinary secure URLs  (strings)
 *   req.processedImageIds   — array of Cloudinary public_ids   (for deletion)
 *   req.processedVideo      — Cloudinary secure URL or null     (string)
 *   req.processedVideoId    — Cloudinary public_id or null      (for deletion)
 */
const resizeImage = async (req, res, next) => {
  req.processedImages = [];
  req.processedImageIds = [];
  req.processedVideo = null;
  req.processedVideoId = null;

  try {
    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.video || [];

    for (const imageFile of imageFiles) {
      const { url, publicId } = await processImage(imageFile);
      req.processedImages.push(url);
      req.processedImageIds.push(publicId);
    }

    if (videoFiles.length) {
      const { url, publicId } = await processVideo(videoFiles[0]);
      req.processedVideo = url;
      req.processedVideoId = publicId;
    }

    next();
  } catch (error) {
    await cleanupProcessedMedia(req);
    console.error("Media processing failed:", error);
    res.status(400).json({ message: "Could not process uploaded files" });
  }
};

module.exports = resizeImage;
module.exports.cleanupProcessedMedia = cleanupProcessedMedia;
module.exports.deleteFromCloudinary = deleteFromCloudinary;