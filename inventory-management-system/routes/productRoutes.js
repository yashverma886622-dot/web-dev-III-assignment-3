const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Creates and validates a new product record in MongoDB. Validates all mandatory fields, ensures non-negative numbers, validates integer quantities, trims whitespace, and automatically calculates the virtual stockValue field.
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *           example:
 *             name: "Wireless Bluetooth Mouse"
 *             sku: "ELEC-MS-101"
 *             category: "Electronics"
 *             price: 799
 *             quantity: 35
 *             reorderLevel: 15
 *             supplier: "Logitech"
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, sku, category, price, quantity, reorderLevel, supplier } = req.body;

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object'
      });
    }

    // Manual checks for clear beginner-friendly error messages
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required and must be non-empty'
      });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required and must be non-empty'
      });
    }

    if (price === undefined || typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price is required and must be greater than or equal to 0'
      });
    }

    if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required and must be a non-negative integer'
      });
    }

    if (!supplier || typeof supplier !== 'string' || !supplier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier is required and must be non-empty'
      });
    }

    if (reorderLevel !== undefined && (!Number.isInteger(reorderLevel) || reorderLevel < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Reorder level must be a non-negative integer'
      });
    }

    const product = await Product.create({
      name: name.trim(),
      sku: sku ? sku.trim() : undefined,
      category: category.trim(),
      price,
      quantity,
      reorderLevel: reorderLevel !== undefined ? reorderLevel : 10,
      supplier: supplier.trim()
    });

    return res.status(201).json(product);
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/products/reports/low-stock:
 *   get:
 *     summary: Low-stock inventory alert report
 *     description: Retrieves products whose available quantity is less than or equal to a specified threshold (defaults to 10). Results are ordered by quantity ascending (most critical shortages first). Also available via alias /api/products/low-stock.
 *     tags:
 *       - Reports & Analytics
 *     parameters:
 *       - name: threshold
 *         in: query
 *         required: false
 *         description: Stock threshold quantity (non-negative integer). Returns products with quantity <= threshold. Defaults to 10.
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *         example: 10
 *     responses:
 *       200:
 *         description: Low-stock products report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LowStockReportResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getLowStockReport = async (req, res, next) => {
  try {
    let threshold = 10; // Default threshold

    if (req.query.threshold !== undefined) {
      threshold = Number(req.query.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) {
        return res.status(400).json({
          success: false,
          message: 'Threshold query parameter must be a non-negative integer'
        });
      }
    }

    const lowStockItems = await Product.find({
      quantity: { $lte: threshold }
    }).sort({ quantity: 1 });

    return res.status(200).json({
      count: lowStockItems.length,
      threshold,
      lowStockItems
    });
  } catch (err) {
    return next(err);
  }
};

router.get('/reports/low-stock', getLowStockReport);

/**
 * @swagger
 * /api/products/low-stock:
 *   get:
 *     summary: Low-stock inventory alert report (convenience alias)
 *     description: "Direct alias route for /api/products/reports/low-stock. Retrieves products whose quantity is less than or equal to threshold (default: 10)."
 *     tags:
 *       - Reports & Analytics
 *     parameters:
 *       - name: threshold
 *         in: query
 *         required: false
 *         description: Stock threshold quantity (non-negative integer). Defaults to 10.
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *         example: 10
 *     responses:
 *       200:
 *         description: Low-stock products report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LowStockReportResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/low-stock', getLowStockReport); // Alias matching PDF screenshot

/**
 * @swagger
 * /api/products/reports/category-summary:
 *   get:
 *     summary: Category-wise inventory summary aggregation
 *     description: Executes a native MongoDB Aggregation Pipeline ($group, $project, $sort) grouping products by category. Calculates totalItems, totalQuantity, totalStockValue (sum of price * quantity), and average price rounded to 2 decimal places. Results are sorted alphabetically by category. Also available via alias /api/products/summary.
 *     tags:
 *       - Reports & Analytics
 *     responses:
 *       200:
 *         description: Category-wise summary aggregation report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySummaryResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $round: [{ $avg: '$price' }, 2] }
        }
      },
      {
        $project: {
          _id: 1,
          category: '$_id',
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: 1,
          avgPrice: 1
        }
      },
      {
        $sort: { _id: 1 } // Alphabetical by category name
      }
    ]);

    return res.status(200).json({
      categories: summary.length,
      summary
    });
  } catch (err) {
    return next(err);
  }
};

router.get('/reports/category-summary', getCategorySummary);

/**
 * @swagger
 * /api/products/summary:
 *   get:
 *     summary: Category-wise inventory summary aggregation (convenience alias)
 *     description: Direct alias route for /api/products/reports/category-summary. Runs MongoDB aggregation pipeline grouping by category.
 *     tags:
 *       - Reports & Analytics
 *     responses:
 *       200:
 *         description: Category-wise summary aggregation report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategorySummaryResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/summary', getCategorySummary); // Alias matching PDF screenshot

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with filtering, sorting, and pagination
 *     description: Retrieves a paginated list of products from MongoDB with full query metadata (total, totalPages, count, page). Supports exact case-insensitive category filtering, price range boundaries, multi-field ascending/descending sorting, and page/limit pagination.
 *     tags:
 *       - Products
 *     parameters:
 *       - name: category
 *         in: query
 *         required: false
 *         description: Filter products by category name (case-insensitive exact match)
 *         schema:
 *           type: string
 *         example: Electronics
 *       - name: minPrice
 *         in: query
 *         required: false
 *         description: Minimum unit price filter (inclusive, non-negative number)
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 500
 *       - name: maxPrice
 *         in: query
 *         required: false
 *         description: Maximum unit price filter (inclusive, non-negative number, must be >= minPrice)
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 5000
 *       - name: sort
 *         in: query
 *         required: false
 *         description: Field and direction to sort by. Allowed fields 'price', 'name', 'quantity', 'createdAt'. Prefix with '-' for descending (e.g. '-price', 'name'). Defaults to '-createdAt' (newest first).
 *         schema:
 *           type: string
 *           enum:
 *             - price
 *             - -price
 *             - name
 *             - -name
 *             - quantity
 *             - -quantity
 *             - createdAt
 *             - -createdAt
 *           default: -createdAt
 *         example: -price
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number (1-indexed integer >= 1, default 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of items per page (integer between 1 and 100, default 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *     responses:
 *       200:
 *         description: Products retrieved successfully with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProductsResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

    const query = {};

    // Filter by Category (case-insensitive)
    if (category) {
      if (typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category query parameter must be a non-empty string'
        });
      }
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // Filter by Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};

      if (minPrice !== undefined) {
        const min = Number(minPrice);
        if (isNaN(min) || min < 0) {
          return res.status(400).json({
            success: false,
            message: 'minPrice query parameter must be a non-negative number'
          });
        }
        query.price.$gte = min;
      }

      if (maxPrice !== undefined) {
        const max = Number(maxPrice);
        if (isNaN(max) || max < 0) {
          return res.status(400).json({
            success: false,
            message: 'maxPrice query parameter must be a non-negative number'
          });
        }
        query.price.$lte = max;
      }

      if (minPrice !== undefined && maxPrice !== undefined) {
        if (Number(minPrice) > Number(maxPrice)) {
          return res.status(400).json({
            success: false,
            message: 'minPrice cannot be greater than maxPrice'
          });
        }
      }
    }

    // Sorting
    const allowedSortFields = ['price', 'name', 'quantity', 'createdAt'];
    let sortOption = { createdAt: -1 }; // Default: newest first

    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;

      if (!allowedSortFields.includes(field)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sort field '${field}'. Allowed sort fields: ${allowedSortFields.join(', ')}`
        });
      }

      sortOption = { [field]: isDesc ? -1 : 1 };
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'page query parameter must be an integer >= 1'
      });
    }

    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'limit query parameter must be an integer between 1 and 100'
      });
    }

    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages,
      count: products.length,
      products
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     description: Retrieves details of a specific product using its 24-character hexadecimal MongoDB ObjectId.
 *     tags:
 *       - Products
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: '${id}'`
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json(product);
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product details
 *     description: Updates specified details of an existing product. Only whitelisted fields are modified ('name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'). Runs schema validators and recalculates virtual fields.
 *     tags:
 *       - Products
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdateInput'
 *           example:
 *             price: 849
 *             quantity: 40
 *             reorderLevel: 12
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: '${id}'`
      });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object'
      });
    }

    // Whitelist allowed fields to prevent injection
    const allowedFields = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];
    const updateData = {};

    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: `No valid update fields provided. Allowed fields: ${allowedFields.join(', ')}`
      });
    }

    // Validate individual fields if provided
    if (updateData.price !== undefined) {
      if (typeof updateData.price !== 'number' || updateData.price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a number greater than or equal to 0'
        });
      }
    }

    if (updateData.quantity !== undefined) {
      if (!Number.isInteger(updateData.quantity) || updateData.quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a non-negative integer'
        });
      }
    }

    if (updateData.reorderLevel !== undefined) {
      if (!Number.isInteger(updateData.reorderLevel) || updateData.reorderLevel < 0) {
        return res.status(400).json({
          success: false,
          message: 'Reorder level must be a non-negative integer'
        });
      }
    }

    if (updateData.name !== undefined && (typeof updateData.name !== 'string' || !updateData.name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Product name cannot be empty'
      });
    }

    if (updateData.category !== undefined && (typeof updateData.category !== 'string' || !updateData.category.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be empty'
      });
    }

    if (updateData.supplier !== undefined && (typeof updateData.supplier !== 'string' || !updateData.supplier.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Supplier cannot be empty'
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json(updatedProduct);
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Atomic stock adjustment (restock or sale)
 *     description: >-
 *       Performs a concurrency-safe atomic inventory adjustment using MongoDB conditional
 *       update operators ($inc and $gte). Prevents race conditions and rejects sales if available
 *       inventory is insufficient. Supports two body formats: either operation ('restock' or 'sale')
 *       with quantity, or direct integer change amount.
 *     tags:
 *       - Stock Management
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockAdjustmentInput'
 *           examples:
 *             RestockOperation:
 *               summary: Restock format
 *               value:
 *                 operation: restock
 *                 quantity: 10
 *             SaleOperation:
 *               summary: Sale format
 *               value:
 *                 operation: sale
 *                 quantity: 2
 *             ChangeFormat:
 *               summary: Change integer format
 *               value:
 *                 change: 15
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockAdjustmentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:id/stock', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: '${id}'`
      });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object'
      });
    }

    let delta = 0;

    // Check Format 1: { operation: 'restock' | 'sale', quantity: number }
    if (req.body.operation !== undefined) {
      const op = String(req.body.operation).toLowerCase().trim();
      const qty = req.body.quantity;

      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock adjustment quantity must be a positive integer greater than zero'
        });
      }

      if (op === 'restock') {
        delta = qty;
      } else if (op === 'sale') {
        delta = -qty;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid operation. Allowed operations: 'restock', 'sale'"
        });
      }
    }
    // Check Format 2: { change: number } (supported from assignment PDF)
    else if (req.body.change !== undefined) {
      const change = req.body.change;

      if (!Number.isInteger(change) || change === 0) {
        return res.status(400).json({
          success: false,
          message: 'Change amount must be a non-zero integer'
        });
      }

      delta = change;
    } else {
      return res.status(400).json({
        success: false,
        message: "Request body must include either { operation: 'restock'|'sale', quantity: number } or { change: number }"
      });
    }

    let updatedProduct;

    if (delta > 0) {
      // Restock: Atomically increment stock
      updatedProduct = await Product.findByIdAndUpdate(
        id,
        { $inc: { quantity: delta } },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    } else {
      // Sale: Atomically decrement stock ONLY IF available stock >= requested quantity
      const saleAmount = Math.abs(delta);

      updatedProduct = await Product.findOneAndUpdate(
        { _id: id, quantity: { $gte: saleAmount } },
        { $inc: { quantity: delta } },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        // Distinguish between non-existent product and insufficient stock
        const existingProduct = await Product.findById(id);

        if (!existingProduct) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        return res.status(400).json({
          success: false,
          message: `Insufficient stock for sale. Available stock: ${existingProduct.quantity}, requested sale: ${saleAmount}`
        });
      }
    }

    return res.status(200).json({
      message: 'Stock updated',
      product: updatedProduct
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product by ID
 *     description: Permanently removes a product record from MongoDB by its 24-character hexadecimal ObjectId.
 *     tags:
 *       - Products
 *     parameters:
 *       - $ref: '#/components/parameters/ProductId'
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteProductResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product ID format: '${id}'`
      });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      message: 'Product deleted',
      id
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
