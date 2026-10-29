// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  console.log(err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", errors: messages });
  }

  // Invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  // Duplicate key error (sku already exists)
  if (err.code === 11000) {
    return res.status(400).json({ message: "SKU already exists" });
  }

  // Anything else
  res.status(500).json({ message: "Server error", error: err.message });
};

module.exports = errorHandler;