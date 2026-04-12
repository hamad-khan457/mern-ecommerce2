require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { sequelize } = require('./models');

const app = express();

app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/items',     require('./routes/items'));
app.use('/api/cart',      require('./routes/cart'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/checkout',  require('./routes/checkout'));
app.use('/api/payment',   require('./routes/payment'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/coupons',   require('./routes/coupons'));
app.use('/api/refunds',   require('./routes/refunds'));

// ── Health (Elastic Beanstalk) ────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `${req.originalUrl} not found` }));

// ── Error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
sequelize.sync({ alter: process.env.NODE_ENV === 'development' }).then(() => {
  console.log('✅ PostgreSQL connected');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => { console.error('❌ DB error:', err.message); process.exit(1); });
