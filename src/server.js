require('dotenv').config();
const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());

// Mount tất cả API dưới prefix /api
app.use('/api', routes);

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});

// Graceful shutdown khi tắt server (Ctrl+C / SIGTERM)
process.on('SIGTERM', () => {
  console.log('SIGTERM nhận được, đang tắt server...');
  server.close(() => {
    const redis = require('./redisClient');
    redis.quit();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT nhận được, đang tắt server...');
  server.close(() => {
    const redis = require('./redisClient');
    redis.quit();
    process.exit(0);
  });
});
