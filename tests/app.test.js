process.env.DATA_SOURCE = 'memory';

const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store');

beforeEach(async () => {
  await store.resetStore();
});

async function registerAndLogin(name, email, password) {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password })
    .expect(201);

  return registerRes.body;
}

test('first registered user is admin and can create products', async () => {
  const admin = await registerAndLogin('Admin', 'admin@example.com', 'Password123!');

  const createRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ name: 'Laptop', description: '15-inch', price: 1200, stock: 5 })
    .expect(201);

  expect(createRes.body.name).toBe('Laptop');

  const products = await request(app).get('/api/products').expect(200);
  expect(products.body).toHaveLength(1);
});

test('normal user cannot create products but can checkout and track orders', async () => {
  const admin = await registerAndLogin('Admin', 'admin@example.com', 'Password123!');

  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ name: 'Phone', description: 'Smart phone', price: 600, stock: 3 })
    .expect(201);

  const user = await registerAndLogin('User', 'user@example.com', 'Password123!');

  await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ name: 'Unauthorized', price: 1, stock: 1 })
    .expect(403);

  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ productId: productRes.body._id, quantity: 2 })
    .expect(201);

  const checkout = await request(app)
    .post('/api/cart/checkout')
    .set('Authorization', `Bearer ${user.token}`)
    .expect(201);

  expect(checkout.body.totalAmount).toBe(1200);
  expect(checkout.body.status).toBe('placed');

  const orders = await request(app)
    .get('/api/orders')
    .set('Authorization', `Bearer ${user.token}`)
    .expect(200);

  expect(orders.body).toHaveLength(1);
  expect(orders.body[0].status).toBe('placed');

  const orderId = orders.body[0]._id;

  await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ status: 'shipped' })
    .expect(200);

  const trackedOrder = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Authorization', `Bearer ${user.token}`)
    .expect(200);

  expect(trackedOrder.body.status).toBe('shipped');

  const products = await request(app).get('/api/products').expect(200);
  expect(products.body[0].stock).toBe(1);
});
