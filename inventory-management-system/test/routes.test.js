const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

// Helper to make requests against Express app without listening on a public port
function request(app, options) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: options.path,
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            server.close(() => {
              try {
                const parsed = JSON.parse(body);
                resolve({ status: res.statusCode, body: parsed, headers: res.headers });
              } catch (e) {
                resolve({ status: res.statusCode, body, headers: res.headers });
              }
            });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  });
}

test('API Route & Request Validation Tests', async (t) => {
  await t.test('GET / should return 200 with API status message', async () => {
    const res = await request(app, { path: '/', method: 'GET' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'online');
    assert.ok(res.body.documentation);
  });

  await t.test('GET /api/health should return health status (503 when DB disconnected)', async () => {
    const res = await request(app, { path: '/api/health', method: 'GET' });
    // In test environment without active MongoDB connection, it returns 503 degraded
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.server, 'running');
    assert.strictEqual(res.body.status, 'degraded');
  });

  await t.test('GET /unknown-route should return 404 JSON', async () => {
    const res = await request(app, { path: '/unknown-route', method: 'GET' });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Route not found/);
  });

  await t.test('POST /api/products with missing fields should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products',
      method: 'POST',
      body: { name: 'Only Name' }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Category is required/);
  });

  await t.test('POST /api/products with negative price should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products',
      method: 'POST',
      body: {
        name: 'Item',
        category: 'Tech',
        price: -20,
        quantity: 5,
        supplier: 'Acme'
      }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Price is required and must be greater than or equal to 0/);
  });

  await t.test('POST /api/products with fractional quantity should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products',
      method: 'POST',
      body: {
        name: 'Item',
        category: 'Tech',
        price: 50,
        quantity: 2.7,
        supplier: 'Acme'
      }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Quantity is required and must be a non-negative integer/);
  });

  await t.test('GET /api/products/:id with invalid ObjectId should return 400 Bad Request', async () => {
    const res = await request(app, { path: '/api/products/bad-id-123', method: 'GET' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid product ID format/);
  });

  await t.test('PUT /api/products/:id with invalid ObjectId should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products/bad-id-123',
      method: 'PUT',
      body: { price: 100 }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid product ID format/);
  });

  await t.test('PUT /api/products/:id with empty/invalid update fields should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products/6a54767af6123427d6e61d76',
      method: 'PUT',
      body: { invalidField: 123 }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /No valid update fields provided/);
  });

  await t.test('GET /api/products with minPrice > maxPrice should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products?minPrice=500&maxPrice=100',
      method: 'GET'
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /minPrice cannot be greater than maxPrice/);
  });

  await t.test('GET /api/products with invalid sort field should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products?sort=unknownField',
      method: 'GET'
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid sort field/);
  });

  await t.test('GET /api/products/reports/low-stock with negative threshold should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products/reports/low-stock?threshold=-5',
      method: 'GET'
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Threshold query parameter must be a non-negative integer/);
  });

  await t.test('PATCH /api/products/:id/stock with invalid operation should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products/6a54767af6123427d6e61d76/stock',
      method: 'PATCH',
      body: { operation: 'destroy', quantity: 5 }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid operation/);
  });

  await t.test('PATCH /api/products/:id/stock with zero or negative quantity should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products/6a54767af6123427d6e61d76/stock',
      method: 'PATCH',
      body: { operation: 'restock', quantity: -5 }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /must be a positive integer greater than zero/);
  });

  await t.test('DELETE /api/products/:id with invalid ObjectId should return 400 Bad Request', async () => {
    const res = await request(app, {
      path: '/api/products/invalid-object-id',
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid product ID format/);
  });

  await t.test('GET /api-docs/ should serve interactive Swagger UI HTML', async () => {
    const res = await request(app, { path: '/api-docs/', method: 'GET' });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(String(res.body), /swagger-ui/i);
  });

  await t.test('GET /api-docs.json should return valid OpenAPI 3.0 specification JSON', async () => {
    const res = await request(app, { path: '/api-docs.json', method: 'GET' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.openapi, '3.0.0');
    assert.strictEqual(res.body.info.title, 'Inventory and Data Management System API');
    assert.ok(res.body.paths['/api/products']);
    assert.ok(res.body.paths['/api/products/{id}']);
    assert.ok(res.body.paths['/api/products/{id}/stock']);
    assert.ok(res.body.paths['/api/products/reports/low-stock']);
    assert.ok(res.body.paths['/api/products/reports/category-summary']);
    assert.ok(res.body.paths['/api/health']);
    assert.ok(res.body.components.schemas.Product);
    assert.ok(res.body.components.schemas.ProductInput);
    assert.ok(res.body.components.schemas.StockAdjustmentInput);
  });
});

