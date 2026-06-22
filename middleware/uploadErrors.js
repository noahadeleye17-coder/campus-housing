const multer = require("multer");

const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "Uploaded file is too large",
      LIMIT_FILE_COUNT: "Too many files uploaded",
      LIMIT_FIELD_COUNT: "Too many form fields submitted",
      LIMIT_FIELD_VALUE: "One of the submitted fields is too large",
      LIMIT_PART_COUNT: "Too many upload parts submitted",
      LIMIT_UNEXPECTED_FILE: "Unexpected upload field",
    };

    return res.status(400).json({
      message: messages[err.code] || "Invalid upload",
    });
  }

  if (err.message && err.message.includes("uploads are allowed")) {
    return res.status(400).json({ message: err.message });
  }

  next(err);
};

module.exports = uploadErrorHandler;
