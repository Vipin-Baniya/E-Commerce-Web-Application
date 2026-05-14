const app = require('./app');
const { connectDatabase } = require('./db');
const { ensureDefaultAdmin } = require('./auth');
const { initStore } = require('./store');

const PORT = Number(process.env.PORT || 3000);

async function start() {
  try {
    await connectDatabase();
    await initStore();
    await ensureDefaultAdmin();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
