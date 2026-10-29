const Product = require("../models/Product");

// CREATE product
// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// GET all products (filter, sort, pagination)
// GET /api/products?category=Furniture&minPrice=100&maxPrice=5000&sort=price&page=1&limit=10
const getAllProducts = async (req, res, next) => {
  try {
    // 1. Filtering
    let filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        filter.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    // 2. Sorting (example: sort=price or sort=-price)
    let sortBy = req.query.sort || "-createdAt";

    // 3. Pagination
    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).sort(sortBy).skip(skip).limit(limit);

    res.status(200).json({
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products: products,
    });
  } catch (err) {
    next(err);
  }
};

// GET single product
// GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

// UPDATE product
// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

// DELETE product
// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted", id: product._id });
  } catch (err) {
    next(err);
  }
};

// Restock or Sale
// PATCH /api/products/:id/stock   body: { "change": 10 } or { "change": -5 }
const adjustStock = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newQuantity = product.quantity + req.body.change;

    // stock negative nahi hona chahiye
    if (newQuantity < 0) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    product.quantity = newQuantity;
    await product.save();

    res.status(200).json({ message: "Stock updated", product: product });
  } catch (err) {
    next(err);
  }
};

// Low stock report (quantity <= reorderLevel)
// GET /api/products/low-stock
const getLowStock = async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] },
    });

    res.status(200).json({
      count: lowStockItems.length,
      lowStockItems: lowStockItems,
    });
  } catch (err) {
    next(err);
  }
};

// Category wise summary (aggregation)
// GET /api/products/summary
const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    res.status(200).json({ categories: summary.length, summary: summary });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStock,
  getCategorySummary,
};