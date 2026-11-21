const test = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../models/Product');
const errorHandler = require('../middleware/errorHandler');

test('Product Schema Validation Tests', async (t) => {
  await t.test('Valid product should pass validation', async () => {
    const validProduct = new Product({
      name: 'Mechanical Keyboard',
      sku: 'TECH-KB-101',
      category: 'Electronics',
      price: 2499,
      quantity: 15,
      reorderLevel: 5,
      supplier: 'Logitech India'
    });

    const error = await validProduct.validate();
    assert.strictEqual(error, undefined);
    assert.strictEqual(validProduct.stockValue, 2499 * 15);
    assert.strictEqual(validProduct.reorderLevel, 5);
  });

  await t.test('Product with default reorderLevel should pass validation', async () => {
    const p = new Product({
      name: 'Ballpoint Pen Pack',
      category: 'Stationery',
      price: 50,
      quantity: 100,
      supplier: 'Reynolds'
    });

    const error = await p.validate();
    assert.strictEqual(error, undefined);
    assert.strictEqual(p.reorderLevel, 10);
    assert.strictEqual(p.stockValue, 5000);
  });

  await t.test('Missing name should fail validation', async () => {
    const p = new Product({
      category: 'Electronics',
      price: 100,
      quantity: 10,
      supplier: 'Supplier'
    });

    await assert.rejects(async () => {
      await p.validate();
    }, /Product name is required/);
  });

  await t.test('Negative price should fail validation', async () => {
    const p = new Product({
      name: 'Item',
      category: 'Electronics',
      price: -50,
      quantity: 10,
      supplier: 'Supplier'
    });

    await assert.rejects(async () => {
      await p.validate();
    }, /Price must be greater than or equal to 0/);
  });

  await t.test('Negative quantity should fail validation', async () => {
    const p = new Product({
      name: 'Item',
      category: 'Electronics',
      price: 50,
      quantity: -5,
      supplier: 'Supplier'
    });

    await assert.rejects(async () => {
      await p.validate();
    }, /Quantity cannot be negative/);
  });

  await t.test('Non-integer quantity should fail validation', async () => {
    const p = new Product({
      name: 'Item',
      category: 'Electronics',
      price: 50,
      quantity: 4.5,
      supplier: 'Supplier'
    });

    await assert.rejects(async () => {
      await p.validate();
    }, /must be an integer/);
  });
});

test('Error Handler Middleware Tests', async (t) => {
  await t.test('Handles CastError as 400 Bad Request', () => {
    const req = { method: 'GET', originalUrl: '/api/products/invalid-id' };
    let responseStatus = 0;
    let responseJson = null;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    const castError = new Error('Cast to ObjectId failed');
    castError.name = 'CastError';
    castError.path = '_id';
    castError.value = 'invalid-id';

    errorHandler(castError, req, res, () => {});

    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseJson.success, false);
    assert.match(responseJson.message, /Invalid _id format/);
  });

  await t.test('Handles malformed JSON body as 400 Bad Request', () => {
    const req = { method: 'POST', originalUrl: '/api/products' };
    let responseStatus = 0;
    let responseJson = null;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    const jsonError = new SyntaxError('Unexpected token in JSON');
    jsonError.status = 400;
    jsonError.body = '{ bad json }';

    errorHandler(jsonError, req, res, () => {});

    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseJson.success, false);
    assert.strictEqual(responseJson.message, 'Malformed JSON payload in request body');
  });
});
