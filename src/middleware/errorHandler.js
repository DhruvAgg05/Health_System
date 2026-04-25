const errorHandler = (err, req, res, next) => {
  if (err.name === "MulterError") {
    const statusCode = err.code === "LIMIT_FILE_SIZE" ? 400 : 500;

    return res.status(statusCode).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "File size must be 5MB or less."
          : err.message || "File upload failed.",
    });
  }

  const statusCode =
    err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
