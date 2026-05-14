const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { authenticate, authorize, issueToken } = require('./auth');
const store = require('./store');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await store.findUserByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const userCount = await store.countUsers();
  const role = userCount === 0 ? 'admin' : 'user';

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await store.createUser({ name: name.trim(), email: normalizedEmail, passwordHash, role });

  return res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token: issueToken(user)
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  const user = await store.findUserByEmail(email.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  return res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token: issueToken(user)
  });
});

app.get('/api/products', async (_req, res) => {
  const products = await store.listProducts();
  return res.json(products);
});

app.post('/api/products', authenticate, authorize('admin'), async (req, res) => {
  const { name, description, price, stock } = req.body;

  if (!name || typeof price !== 'number' || typeof stock !== 'number') {
    return res.status(400).json({ message: 'name, price and stock are required.' });
  }

  const product = await store.createProduct({
    name: name.trim(),
    description: description || '',
    price,
    stock
  });

  return res.status(201).json(product);
});

app.get('/api/cart', authenticate, async (req, res) => {
  const cart = await store.getCartByUserId(req.user.userId);
  return res.json(cart || { user: req.user.userId, items: [] });
});

app.post('/api/cart/items', authenticate, async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId || quantity < 1) {
    return res.status(400).json({ message: 'productId and quantity (>=1) are required.' });
  }

  const product = await store.findProductById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  const cart = (await store.getCartByUserId(req.user.userId)) || (await store.createEmptyCart(req.user.userId));
  const existingItem = cart.items.find((item) => item.product.toString() === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product: product._id, quantity });
  }

  await store.saveCart(cart);

  const updatedCart = await store.getCartByUserId(req.user.userId);
  return res.status(201).json(updatedCart);
});

app.post('/api/cart/checkout', authenticate, async (req, res) => {
  const cart = await store.getCartByUserId(req.user.userId);

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty.' });
  }

  const outOfStockItem = cart.items.find((item) => !item.product || item.product.stock < item.quantity);
  if (outOfStockItem) {
    return res.status(400).json({ message: 'One or more items are out of stock.' });
  }

  const orderItems = [];
  let totalAmount = 0;

  for (const item of cart.items) {
    item.product.stock -= item.quantity;
    await store.saveProduct(item.product);

    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    });

    totalAmount += item.product.price * item.quantity;
  }

  const order = await store.createOrder({
    user: req.user.userId,
    items: orderItems,
    totalAmount,
    status: 'placed'
  });

  cart.items = [];
  await store.saveCart(cart);

  return res.status(201).json(order);
});

app.get('/api/orders', authenticate, async (req, res) => {
  const orders = await store.listOrders(req.user.userId, req.user.role);
  return res.json(orders);
});

app.get('/api/orders/:orderId', authenticate, async (req, res) => {
  const order = await store.findOrderById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  if (req.user.role !== 'admin' && order.user.toString() !== req.user.userId) {
    return res.status(403).json({ message: 'Access denied for this order.' });
  }

  return res.json(order);
});

app.patch('/api/orders/:orderId/status', authenticate, authorize('admin'), async (req, res) => {
  const { status } = req.body;
  const allowed = new Set(['placed', 'processing', 'shipped', 'delivered', 'cancelled']);

  if (!allowed.has(status)) {
    return res.status(400).json({ message: 'Invalid order status.' });
  }

  const order = await store.updateOrderStatus(req.params.orderId, status);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  return res.json(order);
});

app.use((error, _req, res, _next) => {
  if (error && error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }

  if (error && error.code === 11000) {
    return res.status(409).json({ message: 'Resource already exists.' });
  }

  return res.status(500).json({ message: 'Internal server error.' });
});

module.exports = app;
