class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details || null;
  }
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function sendSuccess(res, data, message = "ok") {
  res.send({
    code: 0,
    message,
    data,
  });
}

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  const payload = {
    code: statusCode,
    message: error.message || "Internal Server Error",
    data: null,
  };

  if (error.details) {
    payload.details = error.details;
  }

  res.status(statusCode).send(payload);
}

module.exports = {
  AppError,
  asyncHandler,
  sendSuccess,
  sendError,
};
