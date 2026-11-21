require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');
const { swaggerUi, swaggerSpec } = require('./swagger');

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_management';

// Built-in JSON body parser middleware
app.use(express.json());

// Swagger UI Interactive API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Inventory Management API Documentation'
  })
);

// Raw OpenAPI 3.0 JSON specification endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API status and directory of available endpoints
 *     description: Returns server operational status, version, and links to all primary documentation and API endpoints.
 *     tags:
 *       - Health & System
 *     responses:
 *       200:
 *         description: API status information returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RootInfoResponse'
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Inventory and Data Management System API',
    status: 'online',
    version: '1.0.0',
    documentation: {
      swagger: 'GET /api-docs',
      health: 'GET /api/health',
      products: 'GET /api/products',
      createProduct: 'POST /api/products',
      singleProduct: 'GET /api/products/:id',
      updateProduct: 'PUT /api/products/:id',
      stockAdjustment: 'PATCH /api/products/:id/stock',
      deleteProduct: 'DELETE /api/products/:id',
      lowStockReport: 'GET /api/products/reports/low-stock',
      categorySummary: 'GET /api/products/reports/category-summary'
    }
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: System and database health check
 *     description: Checks server uptime and verifies MongoDB connection state via Mongoose. Returns status 200 (healthy) when connected or 503 (degraded) if disconnected.
 *     tags:
 *       - Health & System
 *     responses:
 *       200:
 *         description: Server is online and MongoDB database is connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Database is disconnected or degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isConnected = dbState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'healthy' : 'degraded',
    server: 'running',
    database: states[dbState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Mount Product routes
app.use('/api/products', productRoutes);

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error-handling middleware
app.use(errorHandler);

// Connect to MongoDB and start listening only after connection succeeds
async function startServer() {
  try {
    console.log(`[Database] Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log(`[Database] Connected to MongoDB successfully at ${MONGO_URI}`);

    app.listen(PORT, () => {
      console.log(`[Server] Inventory Management API running on port ${PORT}`);
      console.log(`[Server] Root: http://localhost:${PORT}/`);
      console.log(`[Server] Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(`[Server] Health Check: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Products API: http://localhost:${PORT}/api/products`);
    });
  } catch (error) {
    console.error('=============================================================');
    console.error('[DATABASE CONNECTION FAILED]');
    console.error(`Unable to connect to MongoDB at: ${MONGO_URI}`);
    console.error(`Error details: ${error.message}`);
    console.error('');
    console.error('Please ensure your local MongoDB Server is installed and running:');
    console.error('1. On Windows: Open Services (services.msc) and start "MongoDB Server"');
    console.error('   or run in an Administrator command prompt: net start MongoDB');
    console.error('   or start mongod manually: mongod --dbpath <data-folder>');
    console.error('2. Ensure MongoDB is listening on 127.0.0.1:27017');
    console.error('3. Check MONGO_URI in your .env file');
    console.error('=============================================================');
  }
}

// Only auto-start when executed directly (not when required in test scripts)
if (require.main === module) {
  startServer();
}

module.exports = app;
