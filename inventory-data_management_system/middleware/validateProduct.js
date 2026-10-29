// Checks the body before creating a product
const validateCreateProduct = (req, res, next) => {
  const { name, sku, category, price, quantity } = req.body;

  if (!name || !sku || !category) {
    return res
      .status(400)
      .json({ message: "name, sku and category are required" });
  }

  if (price === undefined || typeof price !== "number" || price < 0) {
    return res
      .status(400)
      .json({ message: "price must be a number and cannot be negative" });
  }

  if (quantity !== undefined && (typeof quantity !== "number" || quantity < 0)) {
    return res
      .status(400)
      .json({ message: "quantity must be a number and cannot be negative" });
  }

  next();
};

// Checks the body for the stock adjustment (PATCH /:id/stock)
const validateStockChange = (req, res, next) => {
  const { change } = req.body;

  if (change === undefined || typeof change !== "number" || change === 0) {
    return res
      .status(400)
      .json({ message: "change must be a non-zero number" });
  }

  next();
};

module.exports = { validateCreateProduct, validateStockChange };