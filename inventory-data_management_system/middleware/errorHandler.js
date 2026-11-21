/**
 * Centralized error-handling middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log diagnostic info to the terminal for debugging
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || undefined;

  // 1. Handle malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
  }

  // 2. Handle Mongoose invalid ObjectId (CastError)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path || 'ID'} format: '${err.value}'`;
  }

  // 3. Handle Mongoose Schema Validation Errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationMessages = Object.values(err.errors).map((e) => e.message);
    message = validationMessages.join(', ');
    errors = validationMessages;
  }

  // 4. Handle MongoDB duplicate key error
  else if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for field(s): ${fields}`;
  }

  // Send consistent JSON error response without exposing internal stack traces
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
}

module.exports = errorHandler;
