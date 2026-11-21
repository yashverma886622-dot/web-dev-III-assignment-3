const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * OpenAPI 3.0 Specification Definition
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Inventory and Data Management System API',
    version: '1.0.0',
    description:
      'Robust, modular RESTful API for inventory catalog management, stock monitoring, concurrency-safe atomic restock/sale transactions, and analytical aggregation reports built with Node.js, Express.js, MongoDB, and Mongoose.',
    contact: {
      name: 'Inventory System Support'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  tags: [
    {
      name: 'Health & System',
      description: 'Operational status, health check, and system metadata endpoints'
    },
    {
      name: 'Products',
      description: 'Full Product Catalog CRUD operations with advanced filtering, sorting, and pagination'
    },
    {
      name: 'Stock Management',
      description: 'Atomic, concurrency-safe stock adjustments (restock and sales)'
    },
    {
      name: 'Reports & Analytics',
      description: 'Inventory monitoring alerts and MongoDB aggregation pipeline reports'
    }
  ],
  components: {
    schemas: {
      Product: {
        type: 'object',
        required: ['_id', 'name', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'],
        properties: {
          _id: {
            type: 'string',
            description: 'Unique 24-character hexadecimal MongoDB ObjectId',
            example: '662e08f51ab9c5001234abcd'
          },
          name: {
            type: 'string',
            description: 'Product name (trimmed)',
            example: 'Wireless Bluetooth Mouse'
          },
          sku: {
            type: 'string',
            description: 'Optional Stock Keeping Unit identifier (trimmed)',
            example: 'ELEC-MS-101'
          },
          category: {
            type: 'string',
            description: 'Product category (trimmed)',
            example: 'Electronics'
          },
          price: {
            type: 'number',
            minimum: 0,
            description: 'Product unit price (must be >= 0)',
            example: 799
          },
          quantity: {
            type: 'integer',
            minimum: 0,
            description: 'Current available stock quantity (non-negative integer)',
            example: 35
          },
          reorderLevel: {
            type: 'integer',
            minimum: 0,
            default: 10,
            description: 'Inventory reorder threshold (non-negative integer, default: 10)',
            example: 15
          },
          supplier: {
            type: 'string',
            description: 'Supplier or manufacturer name (trimmed)',
            example: 'Logitech'
          },
          stockValue: {
            type: 'number',
            readOnly: true,
            description: 'Virtual computed field representing total stock value (price * quantity)',
            example: 27965
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            readOnly: true,
            description: 'Timestamp when product record was created',
            example: '2026-10-26T12:00:00.000Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            readOnly: true,
            description: 'Timestamp when product record was last modified',
            example: '2026-10-26T12:30:00.000Z'
          },
          __v: {
            type: 'integer',
            readOnly: true,
            description: 'Mongoose internal document version key',
            example: 0
          }
        }
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'category', 'price', 'quantity', 'supplier'],
        properties: {
          name: {
            type: 'string',
            description: 'Product name (non-empty string)',
            example: 'Wireless Bluetooth Mouse'
          },
          sku: {
            type: 'string',
            description: 'Optional Stock Keeping Unit identifier',
            example: 'ELEC-MS-101'
          },
          category: {
            type: 'string',
            description: 'Product category (non-empty string)',
            example: 'Electronics'
          },
          price: {
            type: 'number',
            minimum: 0,
            description: 'Product unit price (number >= 0)',
            example: 799
          },
          quantity: {
            type: 'integer',
            minimum: 0,
            description: 'Current stock quantity (non-negative integer)',
            example: 35
          },
          reorderLevel: {
            type: 'integer',
            minimum: 0,
            default: 10,
            description: 'Minimum stock threshold before replenishment (non-negative integer, default: 10)',
            example: 15
          },
          supplier: {
            type: 'string',
            description: 'Supplier or manufacturer name (non-empty string)',
            example: 'Logitech'
          }
        }
      },
      ProductUpdateInput: {
        type: 'object',
        description: 'Partial product update payload (must include at least one valid field)',
        properties: {
          name: {
            type: 'string',
            description: 'Updated product name (non-empty string)',
            example: 'Ergonomic Bluetooth Mouse'
          },
          sku: {
            type: 'string',
            description: 'Updated SKU identifier',
            example: 'ELEC-MS-102'
          },
          category: {
            type: 'string',
            description: 'Updated category (non-empty string)',
            example: 'Electronics'
          },
          price: {
            type: 'number',
            minimum: 0,
            description: 'Updated unit price (number >= 0)',
            example: 849
          },
          quantity: {
            type: 'integer',
            minimum: 0,
            description: 'Updated stock quantity (non-negative integer)',
            example: 40
          },
          reorderLevel: {
            type: 'integer',
            minimum: 0,
            description: 'Updated reorder threshold (non-negative integer)',
            example: 12
          },
          supplier: {
            type: 'string',
            description: 'Updated supplier name (non-empty string)',
            example: 'Logitech India'
          }
        }
      },
      StockAdjustmentInput: {
        description:
          'Stock adjustment payload. Supports two formats: either operation with quantity, or direct non-zero change integer.',
        oneOf: [
          {
            type: 'object',
            required: ['operation', 'quantity'],
            properties: {
              operation: {
                type: 'string',
                enum: ['restock', 'sale'],
                description: "Adjustment type: 'restock' increments stock; 'sale' atomically decrements stock",
                example: 'restock'
              },
              quantity: {
                type: 'integer',
                minimum: 1,
                description: 'Positive integer quantity to adjust (greater than zero)',
                example: 10
              }
            }
          },
          {
            type: 'object',
            required: ['change'],
            properties: {
              change: {
                type: 'integer',
                description: 'Non-zero integer change (positive for restock, negative for sale)',
                example: 10
              }
            }
          }
        ]
      },
      StockAdjustmentResponse: {
        type: 'object',
        required: ['message', 'product'],
        properties: {
          message: {
            type: 'string',
            example: 'Stock updated'
          },
          product: {
            $ref: '#/components/schemas/Product'
          }
        }
      },
      DeleteProductResponse: {
        type: 'object',
        required: ['message', 'id'],
        properties: {
          message: {
            type: 'string',
            example: 'Product deleted'
          },
          id: {
            type: 'string',
            description: '24-character hexadecimal MongoDB ObjectId of deleted product',
            example: '662e08f51ab9c5001234abcd'
          }
        }
      },
      PaginatedProductsResponse: {
        type: 'object',
        required: ['total', 'page', 'totalPages', 'count', 'products'],
        properties: {
          total: {
            type: 'integer',
            description: 'Total number of products matching query filters in the database',
            example: 12
          },
          page: {
            type: 'integer',
            description: 'Current page number',
            example: 1
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages available',
            example: 2
          },
          count: {
            type: 'integer',
            description: 'Number of product records returned in the current page',
            example: 10
          },
          products: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Product'
            }
          }
        }
      },
      LowStockReportResponse: {
        type: 'object',
        required: ['count', 'threshold', 'lowStockItems'],
        properties: {
          count: {
            type: 'integer',
            description: 'Number of products identified below or equal to threshold',
            example: 2
          },
          threshold: {
            type: 'integer',
            description: 'Stock threshold quantity used for filtering (default: 10)',
            example: 10
          },
          lowStockItems: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Product'
            }
          }
        }
      },
      CategorySummaryItem: {
        type: 'object',
        required: ['_id', 'category', 'totalItems', 'totalQuantity', 'totalStockValue', 'avgPrice'],
        properties: {
          _id: {
            type: 'string',
            description: 'Category name (aggregation group key)',
            example: 'Electronics'
          },
          category: {
            type: 'string',
            description: 'Category name',
            example: 'Electronics'
          },
          totalItems: {
            type: 'integer',
            description: 'Total number of unique products in this category',
            example: 5
          },
          totalQuantity: {
            type: 'integer',
            description: 'Total inventory units in this category',
            example: 101
          },
          totalStockValue: {
            type: 'number',
            description: 'Total monetary value of stock in this category (sum of price * quantity)',
            example: 184950
          },
          avgPrice: {
            type: 'number',
            description: 'Average unit price of products in this category (rounded to 2 decimal places)',
            example: 2819.2
          }
        }
      },
      CategorySummaryResponse: {
        type: 'object',
        required: ['categories', 'summary'],
        properties: {
          categories: {
            type: 'integer',
            description: 'Total count of distinct categories',
            example: 4
          },
          summary: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CategorySummaryItem'
            }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        required: ['status', 'server', 'database', 'timestamp'],
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded'],
            description: 'Overall health status: healthy when database connected, degraded otherwise',
            example: 'healthy'
          },
          server: {
            type: 'string',
            description: 'Express server operational status',
            example: 'running'
          },
          database: {
            type: 'string',
            enum: ['connected', 'disconnected', 'connecting', 'disconnecting', 'unknown'],
            description: 'MongoDB connection state according to Mongoose readyState',
            example: 'connected'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 timestamp of health inspection',
            example: '2026-10-26T16:00:00.000Z'
          }
        }
      },
      RootInfoResponse: {
        type: 'object',
        required: ['message', 'status', 'version', 'documentation'],
        properties: {
          message: {
            type: 'string',
            example: 'Welcome to Inventory and Data Management System API'
          },
          status: {
            type: 'string',
            example: 'online'
          },
          version: {
            type: 'string',
            example: '1.0.0'
          },
          documentation: {
            type: 'object',
            additionalProperties: {
              type: 'string'
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Descriptive error message explaining the failure reason',
            example: 'Price is required and must be greater than or equal to 0'
          },
          errors: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Optional list of specific schema validation error messages',
            example: ['Price must be greater than or equal to 0']
          }
        }
      }
    },
    parameters: {
      ProductId: {
        name: 'id',
        in: 'path',
        required: true,
        description: '24-character hexadecimal MongoDB ObjectId of the target product',
        schema: {
          type: 'string',
          pattern: '^[0-9a-fA-F]{24}$'
        },
        example: '662e08f51ab9c5001234abcd'
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad Request - Validation failed, invalid ID format, or missing required payload',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found - The requested product record or route does not exist',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error - Unexpected server or database exception',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  }
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, 'routes', '*.js').replace(/\\/g, '/'),
    path.join(__dirname, 'server.js').replace(/\\/g, '/')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerUi,
  swaggerSpec
};
