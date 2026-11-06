# Redis Demo – Node.js (Express + ioredis)

Project demo minh họa các tính năng phổ biến của Redis với Node.js.

---

## 📂 Cấu trúc thư mục

```
redis-demo-nodejs/
├── .env.example              # Mẫu biến môi trường
├── .gitignore                # Bỏ qua node_modules, .env, logs...
├── Dockerfile                # Image Node.js
├── docker-compose.yml        # Chạy Redis + App bằng Docker
├── package.json              # Thư viện: express, ioredis, dotenv
├── README.md                 # Hướng dẫn này
└── src/
    ├── redisClient.js        # Kết nối Redis (ioredis)
    ├── routes.js             # Các API demo
    └── server.js             # Khởi chạy Express
```

---

## 🚀 Cách chạy

### Cách 1: Dùng Docker (khuyên dùng, nhanh nhất)

Mở terminal tại thư mục `D:\redis-demo-nodejs`:

```bash
D:
cd D:\redis-demo-nodejs

# Tạo file .env từ mẫu
copy .env.example .env

# Khởi chạy Redis + App
docker-compose up --build
```

Sau khi chạy xong, truy cập: `http://localhost:3000/api/health`

### Cách 2: Cài Redis local trên máy

**Windows:**
- Tải Redis for Windows từ: https://github.com/microsoftarchive/redis/releases
- Hoặc dùng WSL2: `sudo apt install redis-server`

**macOS:** `brew install redis`

**Linux:** `sudo apt install redis-server`

Sau khi cài, khởi động Redis:
```bash
redis-server
```

Chạy ứng dụng Node.js:
```bash
D:
cd D:\redis-demo-nodejs
copy .env.example .env
npm install
npm start
```

Truy cập: `http://localhost:3000/api/health`

---

## 🧪 Hướng dẫn demo từng tính năng

Dùng **curl** (có sẵn Windows 10/11), **Postman**, **Insomnia**, hoặc **Thunder Client** (VS Code).

### 1. Health check – Kiểm tra kết nối Redis

```bash
curl http://localhost:3000/api/health
```

**Kết quả mong đợi:**
```json
{"status":"ok","redis":"PONG"}
```

Nếu trả về lỗi → kiểm tra xem container Redis đã chạy chưa (`docker-compose ps`).

---

### 2. Cache (STRING + TTL)

#### Lưu dữ liệu vào cache (có TTL 60 giây)
```bash
curl -X POST http://localhost:3000/api/cache/hello \
  -H "Content-Type: application/json" \
  -d '{"value":"xin chao Redis","ttl":60}'
```

**Kết quả:** `{"ok":true,"message":"Đã lưu vào cache"}`

#### Lấy dữ liệu từ cache
```bash
curl http://localhost:3000/api/cache/hello
```

**Kết quả:** `{"key":"hello","value":"xin chao Redis","hit":true}`

> Sau 60 giây, key sẽ tự hết hạn. Gọi lại API lấy cache sẽ trả về `{"key":"hello","value":null,"hit":false}`.

#### Xóa cache
```bash
curl -X DELETE http://localhost:3000/api/cache/hello
```

---

### 3. User profile (HASH)

#### Lưu thông tin user
```bash
curl -X POST http://localhost:3000/api/user/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyen Van A","email":"a@example.com","role":"admin"}'
```

#### Lấy thông tin user
```bash
curl http://localhost:3000/api/user/123
```

**Kết quả:**
```json
{"id":"123","name":"Nguyen Van A","email":"a@example.com","role":"admin"}
```

---

### 4. Leaderboard / Xếp hạng điểm (SORTED SET)

#### Cập nhật điểm cho user
```bash
curl -X POST http://localhost:3000/api/leaderboard/score \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","score":95}'

curl -X POST http://localhost:3000/api/leaderboard/score \
  -H "Content-Type: application/json" \
  -d '{"userId":"user2","score":88}'

curl -X POST http://localhost:3000/api/leaderboard/score \
  -H "Content-Type: application/json" \
  -d '{"userId":"user3","score":92}'
```

#### Xem Top 10 leaderboard
```bash
curl http://localhost:3000/api/leaderboard
```

**Kết quả mẫu:**
```json
{
  "leaderboard": [
    {"userId":"user1","score":95},
    {"userId":"user3","score":92},
    {"userId":"user2","score":88}
  ]
}
```

---

### 5. Rate limiter – Giới hạn yêu cầu (INCR + EXPIRE)

Giới hạn **5 yêu cầu / phút** cho mỗi IP.

```bash
for i in 1 2 3 4 5 6; do
  echo "Lần $i:"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/limited
done
```

**Kết quả mẫu:**
```
Lần 1: HTTP 200
Lần 2: HTTP 200
Lần 3: HTTP 200
Lần 4: HTTP 200
Lần 5: HTTP 200
Lần 6: HTTP 429
```

Lần thứ 6 bị chặn do vượt quá giới hạn.

---

### 6. Pub/Sub – Gửi thông báo real-time (PUBLISH)

```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"channel":"thongbao","message":"Co nguoi dung moi dang nhap"}'
```

**Kết quả:**
```json
{"ok":true,"message":"Đã gửi thông báo","channel":"thongbao","subscribers":0}
```

> `subscribers` là số lượng client đang lắng nghe channel này qua Redis SUBSCRIBE. Demo này chỉ minh họa lệnh PUBLISH.

---

## 🔍 Xem dữ liệu trực tiếp trong Redis

### Dùng `redis-cli` qua Docker

```bash
# Vào container Redis
docker exec -it redis-demo-nodejs-redis-1 redis-cli
```

Trong shell Redis, gõ các lệnh:
```
keys *
get hello
hgetall user:123
zrevrange leaderboard 0 9 WITHSCORES
ttl hello
exit
```

### Dùng Redis Insight (GUI, miễn phí)

1. Tải và cài [Redis Insight](https://redis.com/redis-insight/).
2. Thêm kết nối: `localhost:6379`.
3. Xem trực quan các key, hash, sorted set, TTL...

---

## 🛠 Debug khi lỗi

| Dấu hiệu | Nguyên nhân có thể | Cách xử lý |
|----------|-------------------|------------|
| `500 Internal Server Error` | Lỗi code Node.js | Xem log: `docker-compose logs app` |
| `Redis connection refused` | Container Redis chưa sẵn sàng | Chờ vài giây rồi gọi lại API; hoặc `docker-compose restart` |
| `ECONNREFUSED` | App không connect được Redis | Kiểm tra `.env`: `REDIS_HOST=redis` (Docker) hoặc `localhost` (local) |
| API trả về `hit: false` | Key chưa lưu hoặc đã hết TTL | Kiểm tra TTL: `ttl <key>` trong redis-cli |
| Rate limiter không chặn | Redis chưa lưu `incr` đúng | Xem log app; kiểm tra key `ratelimit:<ip>` |

### Xem log real-time
```bash
docker-compose logs -f app
```

### Restart toàn bộ nếu lỗi lạ
```bash
docker-compose down
docker-compose up --build
```

---

## ✅ Checklist sau khi chạy demo

- [ ] `GET /api/health` trả về `"PONG"`
- [ ] Lưu/lấy cache thành công, có `hit: true`
- [ ] Lưu user `POST /api/user/:id`, lấy được `GET /api/user/:id`
- [ ] Leaderboard trả về mảng có `userId` và `score`
- [ ] Gọi `/api/limited` 6 lần → lần 6 trả về `429`
- [ ] `docker exec ... redis-cli keys *` hiển thị các key đã tạo

---

## 🔒 Lưu ý bảo mật

- Trong production, hãy đặt `REDIS_PASSWORD` và ràng buộc `bind` IP.
- Không để Redis mở công khai Internet mà không xác thực.
- Không commit file `.env` lên GitHub (đã có trong `.gitignore`).
- Luôn bọc lệnh Redis trong `try/catch` và cấu hình `retryStrategy` để tự kết nối lại.
