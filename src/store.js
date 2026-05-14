const crypto = require('crypto');
const mongoose = require('mongoose');
const { User, Product, Cart, Order } = require('./models');

const DATA_SOURCE = (process.env.DATA_SOURCE || 'memory').toLowerCase();
const isMongo = DATA_SOURCE === 'mongo';

const memory = {
  users: [],
  products: [],
  carts: [],
  orders: []
};

function id() {
  return crypto.randomUUID();
}

function toPlain(value) {
  if (!value) {
    return value;
  }
  if (typeof value.toObject === 'function') {
    return value.toObject();
  }
  return value;
}

async function initStore() {
  return undefined;
}

async function resetStore() {
  if (isMongo) {
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({})
    ]);
    return;
  }

  memory.users = [];
  memory.products = [];
  memory.carts = [];
  memory.orders = [];
}

async function findUserByEmail(email) {
  if (isMongo) {
    return toPlain(await User.findOne({ email }));
  }
  return memory.users.find((user) => user.email === email) || null;
}

async function countUsers() {
  if (isMongo) {
    return User.countDocuments();
  }
  return memory.users.length;
}

async function createUser({ name, email, passwordHash, role }) {
  if (isMongo) {
    return toPlain(await User.create({ name, email, passwordHash, role }));
  }

  const user = { _id: id(), name, email, passwordHash, role, createdAt: new Date().toISOString() };
  memory.users.push(user);
  return user;
}

async function listProducts() {
  if (isMongo) {
    return Product.find().sort({ createdAt: -1 });
  }
  return [...memory.products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function createProduct({ name, description, price, stock }) {
  if (isMongo) {
    return Product.create({ name, description, price, stock });
  }

  const product = {
    _id: id(),
    name,
    description,
    price,
    stock,
    createdAt: new Date().toISOString()
  };
  memory.products.push(product);
  return product;
}

async function findProductById(productId) {
  if (isMongo) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return null;
    }
    const safeProductId = new mongoose.Types.ObjectId(productId);
    return Product.findById(safeProductId);
  }
  return memory.products.find((product) => product._id === productId) || null;
}

async function saveProduct(product) {
  if (isMongo) {
    return product.save();
  }
  return product;
}

async function getCartByUserId(userId) {
  if (isMongo) {
    return Cart.findOne({ user: userId }).populate('items.product');
  }

  const cart = memory.carts.find((entry) => entry.user === userId);
  if (!cart) {
    return null;
  }

  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      product: memory.products.find((product) => product._id === item.product)
    }))
  };
}

async function createEmptyCart(userId) {
  if (isMongo) {
    return Cart.create({ user: userId, items: [] });
  }

  const cart = { _id: id(), user: userId, items: [] };
  memory.carts.push(cart);
  return cart;
}

async function saveCart(cart) {
  if (isMongo) {
    return cart.save();
  }

  const index = memory.carts.findIndex((item) => item._id === cart._id);
  const normalizedItems = cart.items.map((item) => ({
    product: typeof item.product === 'object' ? item.product._id : item.product,
    quantity: item.quantity
  }));

  if (index >= 0) {
    memory.carts[index] = {
      ...memory.carts[index],
      items: normalizedItems
    };
  } else {
    memory.carts.push({ _id: cart._id || id(), user: cart.user, items: normalizedItems });
  }

  return cart;
}

async function createOrder({ user, items, totalAmount, status }) {
  if (isMongo) {
    return Order.create({ user, items, totalAmount, status });
  }

  const order = {
    _id: id(),
    user,
    items,
    totalAmount,
    status,
    createdAt: new Date().toISOString()
  };
  memory.orders.push(order);
  return order;
}

async function listOrders(userId, role) {
  if (isMongo) {
    const filter = role === 'admin' ? {} : { user: userId };
    return Order.find(filter).sort({ createdAt: -1 });
  }

  const allOrders = role === 'admin' ? memory.orders : memory.orders.filter((order) => order.user === userId);
  return [...allOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function findOrderById(orderId) {
  if (isMongo) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return null;
    }
    const safeOrderId = new mongoose.Types.ObjectId(orderId);
    return Order.findById(safeOrderId);
  }
  return memory.orders.find((order) => order._id === orderId) || null;
}

async function updateOrderStatus(orderId, status) {
  if (isMongo) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return null;
    }
    const safeOrderId = new mongoose.Types.ObjectId(orderId);
    await Order.updateOne({ _id: safeOrderId }, { $set: { status } });
    return Order.findById(safeOrderId);
  }

  const order = memory.orders.find((item) => item._id === orderId);
  if (!order) {
    return null;
  }
  order.status = status;
  return order;
}

module.exports = {
  isMongo,
  initStore,
  resetStore,
  findUserByEmail,
  countUsers,
  createUser,
  listProducts,
  createProduct,
  findProductById,
  saveProduct,
  getCartByUserId,
  createEmptyCart,
  saveCart,
  createOrder,
  listOrders,
  findOrderById,
  updateOrderStatus
};
