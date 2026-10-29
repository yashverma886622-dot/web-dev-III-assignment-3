const express = require("express");
const router = express.Router();

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStock,
  getCategorySummary,
} = require("../controller/productController");

const {
  validateCreateProduct,
  validateStockChange,
} = require("../middleware/validateProduct");

// IMPORTANT: /low-stock and /summary must come BEFORE /:id
// otherwise Express will treat "low-stock" as an id
router.get("/low-stock", getLowStock);
router.get("/summary", getCategorySummary);

router.post("/", validateCreateProduct, createProduct);
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", validateStockChange, adjustStock);

module.exports = router;