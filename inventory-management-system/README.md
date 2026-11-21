# Inventory and Data Management System (REST API)

> **Course**: Web Development III  
> **Unit Covered**: Unit – 3 (Node.js, Express.js, MongoDB & Mongoose)  
> **Assignment**: Lab Assignment 3 – Inventory and Data Management System  
> **Exam Duration**: 30–40 Minutes Practical Evaluation  

---

## 1. Project Overview

The **Inventory and Data Management System** is a robust, modular RESTful backend built with **Node.js**, **Express.js**, and **MongoDB** (via **Mongoose**). It is engineered for retail stores and warehouses to manage product catalogs, monitor inventory levels, safely process restock/sale transactions with atomic operations, and generate analytical aggregation reports.

### Key Capabilities
- **Strict Data Integrity**: Mongoose schema validation for all product fields, including trimming, non-negative numbers, and integer stock counts.
- **Full CRUD API**: Endpoints for creating, listing, reading, updating, and deleting product records.
- **Advanced Query Engine**: Server-side filtering by category and price range, sorting (ascending/descending), and pagination with complete metadata (`total`, `totalPages`, `count`, `page`).
- **Atomic Stock Adjustments**: Concurrency-safe restock and sale operations using conditional MongoDB updates (`$inc` and `$gte`) to eliminate race conditions and negative inventory.
- **Real MongoDB Aggregations**: Category-wise summary reports computing total items, units, average price, and total stock value using native MongoDB pipeline stages.
- **Centralized Error Handling**: Unified middleware returning standard JSON responses for validation errors, invalid ObjectIds, malformed JSON, and server faults.

---

## 2. Technology Stack & Rules

This project adheres strictly to the assignment specifications and constraints:

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | v18+ (tested on v24) | Server-side JavaScript runtime |
| **Framework** | Express.js | v5.x | Routing, JSON body parsing, and middleware |
| **Database** | MongoDB | Local Community Server | Persistent NoSQL document storage |
| **ODM** | Mongoose | v9.x | Schemas, validations, virtuals, and aggregation |
| **Configuration**| dotenv | v18.x | Secure environment variable management |

### Assignment Compliance Checklist
- [x] Only permitted dependencies used (`express`, `mongoose`, `dotenv`).
- [x] CommonJS syntax (`require()` and `module.exports`).
- [x] No frontend frameworks (React, Angular, etc.).
- [x] No ORMs like Prisma or Sequelize.
- [x] No pre-built CMS or inventory templates.
- [x] Tested with **Thunder Client** in VS Code (no Postman).
- [x] No hardcoded credentials; fully configurable via `.env`.

---

## 3. Project Directory Structure

```text
inventory-management-system/
├── data/
│   └── sampleProducts.json      # 12 real-world seed products
├── middleware/
│   └── errorHandler.js          # Centralized error handler middleware
├── models/
│   └── Product.js               # Mongoose schema with field validation & virtuals
├── routes/
│   └── productRoutes.js         # REST endpoints (CRUD, queries, reports, stock)
├── test/
│   ├── unit.test.js             # Mongoose schema & error middleware tests
│   └── routes.test.js           # API route & request validation tests
├── .env                         # Local environment configuration (git-ignored)
├── .env.example                 # Environment configuration template
├── .gitignore                   # Excludes node_modules and local .env
├── package.json                 # Project dependencies and npm scripts
├── seed.js                      # Database seeder script
├── server.js                    # Express app initialization & MongoDB lifecycle
├── swagger.js                   # OpenAPI 3.0 & Swagger UI configuration
├── thunder-collection_inventory_management.json # Instant Thunder Client import
└── README.md                    # Complete documentation & practical exam guide
```

---

## 4. Prerequisites & Installation

### Step 1: Install Node.js
Ensure Node.js (version 18 or above) is installed:
```powershell
node -v
npm -v
```

### Step 2: Install Project Dependencies
Run from the root directory:
```powershell
npm install
```

### Step 3: Start Local MongoDB Server
Ensure MongoDB Community Server is installed and listening on `127.0.0.1:27017`.

- **Windows Service**:
  Open PowerShell as Administrator and run:
  ```powershell
  net start MongoDB
  ```
  *(Or press `Win + R`, type `services.msc`, locate "MongoDB Server", and click "Start")*

- **Manual Start (mongod)**:
  ```powershell
  mongod --dbpath "C:\data\db"
  ```

### Step 4: Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```powershell
Copy-Item .env.example .env
```
Default `.env` configuration:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/inventory_management
```

---

## 5. Starting the Application

### Production / Standard Mode:
```powershell
npm start
```

### Development Mode (Auto-reload on file change):
```powershell
npm run dev
```

### Seed Sample Products (Requires running MongoDB):
```powershell
npm run seed
```

### Run Automated Tests (No external database required):
```powershell
npm test
```
*Executes 26 unit and route verification tests using Node.js's native test runner.*

---

## 6. Complete API Reference

Base URL: `http://localhost:3000`

### Summary of Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api-docs` | Interactive Swagger UI API documentation (`/api-docs/`) |
| **GET** | `/api-docs.json` | Raw OpenAPI 3.0 specification JSON |
| **GET** | `/` | API status and directory of available endpoints |
| **GET** | `/api/health` | Health check verifying server and database connection |
| **POST** | `/api/products` | Create a new product |
| **GET** | `/api/products` | Get all products (with filtering, sorting, pagination) |
| **GET** | `/api/products/:id` | Get details of a single product by ID |
| **PUT** | `/api/products/:id` | Update product details |
| **PATCH** | `/api/products/:id/stock` | Atomic stock adjustment (restock or sale) |
| **DELETE** | `/api/products/:id` | Delete a product by ID |
| **GET** | `/api/products/reports/low-stock` | Low-stock report (`quantity <= threshold`) |
| **GET** | `/api/products/reports/category-summary` | Category-wise aggregation report |

---

### Detailed Endpoint Specifications

#### 1. API Status
- **Method**: `GET`
- **URL**: `http://localhost:3000/`
- **Response (200 OK)**:
```json
{
  "message": "Welcome to Inventory and Data Management System API",
  "status": "online",
  "version": "1.0.0",
  "documentation": { ... }
}
```

---

#### 2. Health Check
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/health`
- **Response (200 OK - DB Connected)**:
```json
{
  "status": "healthy",
  "server": "running",
  "database": "connected",
  "timestamp": "2026-10-26T15:30:00.000Z"
}
```
*(Returns `503 Service Unavailable` with `"database": "disconnected"` if MongoDB is offline)*

---

#### 3. Create Product
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/products`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```
- **Response (201 Created)**:
```json
{
  "_id": "6a547727f6123427d6e61d7c",
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens",
  "createdAt": "2026-10-26T15:30:00.000Z",
  "updatedAt": "2026-10-26T15:30:00.000Z",
  "stockValue": 4800,
  "id": "6a547727f6123427d6e61d7c"
}
```

---

#### 4. Get All Products (Querying, Filtering & Pagination)
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/products`
- **Supported Query Parameters**:
  - `category`: Filter products by category (case-insensitive substring match).
  - `minPrice`: Filter by minimum price (`price >= minPrice`).
  - `maxPrice`: Filter by maximum price (`price <= maxPrice`).
  - `sort`: Sort by field (`price`, `-price`, `name`, `-name`, `quantity`, `-quantity`, `createdAt`, `-createdAt`). Defaults to `-createdAt`.
  - `page`: Page number (default: 1).
  - `limit`: Items per page (default: 10, max: 100).

- **Examples**:
  - `GET /api/products` (first 10 items)
  - `GET /api/products?category=Electronics`
  - `GET /api/products?minPrice=500&maxPrice=3000`
  - `GET /api/products?sort=-price` (highest price first)
  - `GET /api/products?page=2&limit=5`

- **Response (200 OK)**:
```json
{
  "total": 12,
  "page": 1,
  "totalPages": 2,
  "count": 10,
  "products": [
    {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 2,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "createdAt": "2026-10-26T15:24:18.351Z",
      "updatedAt": "2026-10-26T15:24:18.351Z",
      "stockValue": 7998,
      "id": "6a54767af6123427d6e61d76"
    }
  ]
}
```

---

#### 5. Get Single Product by ID
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/products/:id`
- **Response (200 OK)**: Product JSON object.
- **Error Responses**:
  - `400 Bad Request`: If `:id` is not a valid 24-character hexadecimal ObjectId.
  - `404 Not Found`: If product does not exist.

---

#### 6. Update Product Details
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/products/:id`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "price": 140,
  "quantity": 60
}
```
- **Response (200 OK)**: Updated product JSON object.

---

#### 7. Atomic Stock Adjustment
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/products/:id/stock`
- **Headers**: `Content-Type: application/json`

**Option A (Operation Syntax - Recommended)**:
```json
{
  "operation": "restock",
  "quantity": 10
}
```
or
```json
{
  "operation": "sale",
  "quantity": 2
}
```

**Option B (Change Syntax)**:
```json
{
  "change": 10
}
```
*(Positive integer for restock, negative integer for sale)*

- **Atomic Protection**: Uses `{ _id: id, quantity: { $gte: saleAmount } }` with `$inc: { quantity: -saleAmount }`. If existing stock is insufficient, MongoDB rejects the update, preventing negative inventory.
- **Response (200 OK)**:
```json
{
  "message": "Stock updated",
  "product": { ... }
}
```
- **Error (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Insufficient stock for sale. Available stock: 2, requested sale: 5"
}
```

---

#### 8. Delete Product
- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/products/:id`
- **Response (200 OK)**:
```json
{
  "message": "Product deleted",
  "id": "6a547727f6123427d6e61d7c"
}
```
- **Error (404 Not Found)**:
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

#### 9. Low-Stock Report
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/products/reports/low-stock?threshold=10`  
  *(Also aliased at `/api/products/low-stock`)*
- **Query Parameter**:
  - `threshold` (optional, default: 10): Identifies products where `quantity <= threshold`.
- **Response (200 OK)**:
```json
{
  "count": 4,
  "threshold": 10,
  "lowStockItems": [
    {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 2,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "stockValue": 7998
    }
  ]
}
```

---

#### 10. Category-Wise Inventory Summary (Aggregation)
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/products/reports/category-summary`  
  *(Also aliased at `/api/products/summary`)*
- **Implementation**: Real MongoDB aggregation pipeline:
  ```javascript
  [
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
    { $sort: { _id: 1 } }
  ]
  ```
- **Response (200 OK)**:
```json
{
  "categories": 5,
  "summary": [
    {
      "_id": "Apparel",
      "category": "Apparel",
      "totalItems": 2,
      "totalQuantity": 78,
      "totalStockValue": 85922,
      "avgPrice": 1299
    },
    {
      "_id": "Electronics",
      "category": "Electronics",
      "totalItems": 4,
      "totalQuantity": 96,
      "totalStockValue": 343984,
      "avgPrice": 3299
    },
    {
      "_id": "Furniture",
      "category": "Furniture",
      "totalItems": 2,
      "totalQuantity": 7,
      "totalStockValue": 40493,
      "avgPrice": 5249
    },
    {
      "_id": "Kitchenware",
      "category": "Kitchenware",
      "totalItems": 2,
      "totalQuantity": 11,
      "totalStockValue": 6942,
      "avgPrice": 574.5
    },
    {
      "_id": "Stationery",
      "category": "Stationery",
      "totalItems": 2,
      "totalQuantity": 100,
      "totalStockValue": 19800,
      "avgPrice": 185
    }
  ]
}
```

---

## 7. Testing with Thunder Client in VS Code

The assignment strictly forbids Postman. Use **Thunder Client**, a lightweight REST API client directly embedded inside VS Code:

### 1. Install Thunder Client
1. Open VS Code.
2. Click the **Extensions** icon on the left bar (`Ctrl + Shift + X`).
3. Search for `Thunder Client` (by Ranga Mavuram) and click **Install**.

### 2. Import Pre-Built Collection
We have provided an all-in-one collection file: `thunder-collection_inventory_management.json`.
1. Click the **Thunder Client** lightning bolt icon on the VS Code activity bar.
2. Go to **Collections** tab.
3. Click the menu icon (`...`) in the top-right of the Thunder Client panel and select **Import**.
4. Choose `thunder-collection_inventory_management.json` from the project directory.
5. All 16 organized requests (Core, CRUD, Queries, Stock, Reports) are now loaded with valid sample bodies and headers!

---

## 8. 30–40 Minute Practical Exam Demonstration Sequence

Follow this step-by-step checklist during the practical viva:

### Step 1: Explain Architecture & Project Files (3 mins)
- Point to `models/Product.js`: Highlight Mongoose validation (`min: 0`, integer check, `trim`, and the virtual `stockValue`).
- Point to `server.js`: Show dotenv configuration, the database connect guard (the server will only listen if MongoDB is connected), and route mounting.
- Point to `middleware/errorHandler.js`: Explain centralized error mapping (`CastError` for bad IDs, `ValidationError`, duplicate key errors).

### Step 2: Show Automated Unit Tests (2 mins)
Run the built-in test suite to demonstrate 100% test pass rate:
```powershell
npm test
```
*Verify that all 26 test cases pass instantly.*

### Step 3: Seed Sample Products (2 mins)
Ensure MongoDB is running, then run:
```powershell
npm run seed
```
*Confirms 12 products across 5 categories seeded successfully.*

### Step 4: Start the Server (1 min)
```powershell
npm run dev
```
*Observe the clean console output displaying connection status and port 3000.*

### Step 5: Execute CRUD Operations in Thunder Client (8 mins)
1. **Health Check**: `GET /api/health` -> verify `"status": "healthy"`, `"database": "connected"`.
2. **Create Product**: `POST /api/products` with valid JSON -> returns `201 Created` with computed `stockValue`.
3. **Trigger Validation Error**: `POST /api/products` with `price: -10` -> returns `400 Bad Request` with clear validation message.
4. **Get Single Product**: `GET /api/products/:id` -> returns product.
5. **Trigger Malformed ID**: `GET /api/products/invalid-id` -> returns `400 Bad Request` ("Invalid product ID format").
6. **Update Product**: `PUT /api/products/:id` with new price -> returns updated document.

### Step 6: Demonstrate Filtering, Sorting & Pagination (8 mins)
1. **Category Filter**: `GET /api/products?category=Electronics` -> returns only Electronics products.
2. **Price Range**: `GET /api/products?minPrice=500&maxPrice=2000` -> returns items between 500 and 2000.
3. **Sorting**: `GET /api/products?sort=-price` -> displays highest priced items first.
4. **Pagination**: `GET /api/products?page=1&limit=5` -> shows items 1-5 with `total`, `totalPages: 3`, and `count: 5`.

### Step 7: Demonstrate Concurrency-Safe Stock Adjustments (6 mins)
1. **Restock**: `PATCH /api/products/:id/stock` with `{"operation": "restock", "quantity": 10}` -> stock increases by 10.
2. **Sale**: `PATCH /api/products/:id/stock` with `{"operation": "sale", "quantity": 3}` -> stock decreases by 3.
3. **Prevent Overselling**: `PATCH /api/products/:id/stock` with `{"operation": "sale", "quantity": 9999}` -> returns `400 Bad Request`: "Insufficient stock for sale".

### Step 8: Demonstrate Aggregation Reports (6 mins)
1. **Low Stock**: `GET /api/products/reports/low-stock?threshold=10` -> lists all items with stock `<= 10`.
2. **Category Summary Pipeline**: `GET /api/products/reports/category-summary` -> explains MongoDB `$group`, `$multiply`, `$round`, and `$sort` pipeline computing real-time inventory value.

---

## 9. Troubleshooting & FAQ

#### Q1: "Database connection failed: connect ECONNREFUSED 127.0.0.1:27017"
- **Solution**: The local MongoDB service is not started. Start it via `net start MongoDB` in an administrator terminal or through Windows Services (`services.msc`).

#### Q2: Why is Swagger UI not installed?
- **Answer**: The assignment rubric and instructions explicitly state: *"Only Node.js, Express, Mongoose, and dotenv are allowed"*. Third-party packages such as `swagger-ui-express` violate the lab constraints. Thunder Client is the instructor-approved testing tool.

#### Q3: How are invalid inputs handled?
- **Answer**: Express route guards check parameter ranges, types, and ObjectIds before querying MongoDB. Unhandled exceptions are intercepted by `middleware/errorHandler.js`, returning uniform JSON error objects with appropriate HTTP status codes (400, 404, 409, 500).
