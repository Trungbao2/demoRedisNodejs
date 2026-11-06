const express = require('express');
const redis = require('./redisClient');

const router = express.Router();

/* ============================================================
   1. HEALTH CHECK
============================================================ */
router.get('/health', async (req, res) => {
  try {
    const pong = await redis.ping();
    res.json({ status: 'ok', redis: pong });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/* ============================================================
   2. CACHE (STRING) – GET/SET có TTL
============================================================ */
// Lấy giá trị từ cache
router.get('/cache/:key', async (req, res) => {
  try {
    const value = await redis.get(req.params.key);
    res.json({
      key: req.params.key,
      value,
      hit: value !== null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lưu vào cache (có thể chỉ định TTL bằng giây)
router.post('/cache/:key', async (req, res) => {
  try {
    const { value, ttl } = req.body;

    if (ttl) {
      await redis.setex(req.params.key, parseInt(ttl), value);
    } else {
      await redis.set(req.params.key, value);
    }

    res.json({ ok: true, message: 'Đã lưu vào cache' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa cache theo key
router.delete('/cache/:key', async (req, res) => {
  try {
    await redis.del(req.params.key);
    res.json({ ok: true, message: 'Đã xóa cache' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   3. USER PROFILE (HASH)
============================================================ */
// Lưu thông tin user vào Hash
router.post('/user/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    await redis.hset(`user:${req.params.id}`, {
      name,
      email,
      role,
    });

    res.json({ ok: true, message: 'Đã lưu user profile' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy toàn bộ thông tin user
router.get('/user/:id', async (req, res) => {
  try {
    const data = await redis.hgetall(`user:${req.params.id}`);

    if (Object.keys(data).length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }

    res.json({ id: req.params.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   4. LEADERBOARD (SORTED SET) – xếp hạng điểm
============================================================ */
// Cập nhật / thêm điểm cho user
router.post('/leaderboard/score', async (req, res) => {
  try {
    const { userId, score } = req.body;

    if (!userId || score == null) {
      return res.status(400).json({ error: 'Thiếu userId hoặc score' });
    }

    await redis.zadd('leaderboard', parseFloat(score), userId);

    res.json({ ok: true, message: 'Đã cập nhật điểm' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy Top 10 leaderboard (cao nhất xuống thấp nhất)
router.get('/leaderboard', async (req, res) => {
  try {
    // WITHSCORES trả về mảng xen kẽ: [userId, score, userId, score, ...]
    const raw = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

    const leaderboard = [];
    for (let i = 0; i < raw.length; i += 2) {
      leaderboard.push({
        userId: raw[i],
        score: parseFloat(raw[i + 1]),
      });
    }

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   5. RATE LIMITER (INCR + EXPIRE)
============================================================ */
// Giới hạn 5 yêu cầu / phút cho mỗi IP
const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 60); // hết hạn sau 60 giây
    }

    // Header thông báo cho client
    res.set('X-RateLimit-Limit', 5);
    res.set('X-RateLimit-Remaining', Math.max(0, 5 - count));

    if (count > 5) {
      return res.status(429).json({
        error: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

router.get('/limited', rateLimiter, (req, res) => {
  res.json({ message: 'Bạn được phép truy cập tài nguyên này' });
});

/* ============================================================
   6. PUBSUB – gửi thông báo real-time (đơn giản)
============================================================ */
router.post('/notify', async (req, res) => {
  try {
    const { channel, message } = req.body;

    if (!channel || !message) {
      return res.status(400).json({ error: 'Thiếu channel hoặc message' });
    }

    // publish trả về số lượng client đang subscribe channel này
    const subscriberCount = await redis.publish(channel, message);

    res.json({
      ok: true,
      message: 'Đã gửi thông báo',
      channel,
      subscribers: subscriberCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.rateLimiter = rateLimiter;
