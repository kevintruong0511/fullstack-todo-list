# 📝 Todo Web — Full-stack Task Management

Một ứng dụng **Todo / Task Management** full-stack được build theo hướng có thể deploy production thực sự (không chỉ chạy local). Toàn bộ stack được đóng gói bằng **Docker**, có **2 môi trường tách biệt (dev / prod)** và **CI/CD tự động** từ GitHub Actions → VPS.

> Mục tiêu của project: thực hành quy trình **dev → build → ship → deploy** đầy đủ cho một app web nhỏ — từ code local đến chạy thật trên VPS sau mỗi lần `git push`.

---

## 🧱 Kiến trúc tổng quan

```
┌────────────────────┐        ┌────────────────────┐        ┌────────────────────┐
│      Browser       │ ─────▶ │   Nginx (fe:80)    │ ─────▶ │  Express (be:5000) │
│  (React + Vite)    │  /api  │  serve static +    │  HTTP  │   Node.js + JWT    │
│                    │ ─────▶ │   reverse-proxy    │ ─────▶ │                    │
└────────────────────┘        └────────────────────┘        └─────────┬──────────┘
                                                                       │
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │  PostgreSQL 16     │
                                                            │   (volume pgdata)  │
                                                            └────────────────────┘
```

- **Frontend** ([fe/](fe/)): React 19 + Vite 8, Redux Toolkit, React Router, Axios.
- **Backend** ([be/](be/)): Node.js + Express 4, JWT auth, Swagger docs (`/api-docs`).
- **Database**: PostgreSQL 16 (alpine), data persist trong Docker volume `pgdata`.
- **Reverse proxy (prod)**: Nginx serve static FE + proxy `/api` → backend container.
- **Infra**: Docker Compose, có 2 file riêng cho **dev** và **prod**.

---

## 📂 Cấu trúc thư mục

```
Todo-Web/
├── be/                          # Backend (Express + PostgreSQL)
│   ├── src/
│   │   ├── app/                 # auth/, task/, user/ modules
│   │   ├── configs/
│   │   ├── middlewares/
│   │   └── app.js
│   ├── server.js
│   ├── db.js
│   ├── swagger.json
│   └── package.json
│
├── fe/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/               # Dashboard, Login, Register, TaskList, ...
│   │   ├── components/          # auth/, layout/, ui/
│   │   ├── redux/
│   │   └── api/
│   └── package.json
│
├── infrastructure/              # Docker & deploy
│   ├── docker/
│   │   ├── be.Dockerfile        # dev
│   │   ├── be.prod.Dockerfile   # prod
│   │   ├── fe.Dockerfile        # dev
│   │   ├── fe.prod.Dockerfile   # prod (multi-stage build → nginx)
│   │   └── nginx.conf           # prod reverse-proxy config
│   ├── docker-compose.yml       # dev stack
│   ├── docker-compose.prod.yml  # prod stack
│   ├── .env.prod.example
│   └── Makefile                 # shortcut cho dev & prod
│
└── .github/workflows/
    └── deploy.yml               # CI/CD: push main → SSH vào VPS → rebuild
```

---

## 🚀 Tech Stack

| Layer       | Technology                                          |
| ----------- | --------------------------------------------------- |
| Frontend    | React 19, Vite 8, Redux Toolkit, React Router 7     |
| Backend     | Node.js 20, Express 4, JWT, bcryptjs                |
| Database    | PostgreSQL 16                                       |
| Infra       | Docker, Docker Compose, Nginx                       |
| CI/CD       | GitHub Actions + `appleboy/ssh-action`              |
| Hosting     | VPS (Ubuntu / Debian-like, có Docker + Compose v2)  |

---

## 🧑‍💻 Chạy ở môi trường Development

Tất cả chạy trong Docker — **không cần cài Node hay Postgres trên máy host**.

### Yêu cầu

- Docker Desktop (hoặc Docker Engine + Compose v2)
- File [be/.env](be/.env) (copy từ [be/.env.example](be/.env.example) nếu chưa có)

### Lệnh

```bash
cd infrastructure
docker compose up --build
# hoặc dùng Makefile:
make up
```

| Service       | URL                                       |
| ------------- | ----------------------------------------- |
| Frontend      | http://localhost:5173                     |
| Backend API   | http://localhost:5001                     |
| Swagger docs  | http://localhost:5001/api-docs            |
| Health check  | http://localhost:5001/health              |
| PostgreSQL    | `localhost:5435` (user/pass: `postgres`)  |

### Hot reload

- **Backend**: sửa file trong [be/](be/), container tự restart (`node --watch`).
- **Frontend**: sửa file trong [fe/](fe/), browser tự HMR (Vite + polling cho macOS).

Chi tiết thêm xem [infrastructure/README.md](infrastructure/README.md).

---

## 🏭 Production stack

Khác với dev:

- FE được **build static** rồi serve bằng **Nginx** (multi-stage Dockerfile).
- Nginx vừa serve static, vừa **reverse-proxy `/api` → backend** → FE chỉ cần gọi `/api/...` (cùng origin → không CORS).
- BE chạy `node server.js` (không `--watch`), `NODE_ENV=production`, deps cài bằng `npm ci --omit=dev`.
- Postgres dùng **credentials thật** từ [.env.prod](infrastructure/.env.prod.example), không phải `postgres/postgres`.
- Postgres **không expose** port ra ngoài host — chỉ truy cập được từ network nội bộ Docker.
- FE container expose `HTTP_PORT` (mặc định `80`) ra ngoài.

### Chạy thử prod stack ở local

```bash
cd infrastructure
cp .env.prod.example .env.prod
# sửa POSTGRES_PASSWORD, JWT_SECRET, đổi HTTP_PORT=8080 nếu port 80 đang bận
make prod-up
# → mở http://localhost:8080
```

---

## 🤖 CI/CD — Tự động deploy khi push lên `main`

Pipeline rất đơn giản & rõ ràng, file: [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

### Quy trình tổng quát

```
git push origin main
        │
        ▼
┌──────────────────────────┐
│  GitHub Actions runner   │
│  (ubuntu-latest)         │
│                          │
│  appleboy/ssh-action     │
│  → SSH vào VPS           │
└──────────────┬───────────┘
               │  ssh user@vps
               ▼
┌──────────────────────────────────────────────────┐
│ VPS (/root/todo-web)                             │
│  1. git pull origin main                         │
│  2. cd infrastructure                            │
│  3. docker compose -f docker-compose.prod.yml \  │
│       --env-file .env.prod up -d --build         │
│  4. docker image prune -f                        │
│  5. docker compose ps  (verify)                  │
└──────────────────────────────────────────────────┘
```

### Trigger

- Tự động: mỗi `push` vào branch `main`.
- Thủ công: tab **Actions → Deploy to VPS → Run workflow** (`workflow_dispatch`).

### GitHub Secrets cần khai báo

Settings → Secrets and variables → Actions → **New repository secret**:

| Secret          | Giá trị                                                       |
| --------------- | ------------------------------------------------------------- |
| `VPS_HOST`      | IP hoặc domain của VPS (vd `123.45.67.89`)                    |
| `VPS_USER`      | User SSH (vd `root`, hoặc user có quyền chạy docker)          |
| `VPS_SSH_KEY`   | **Private key** (PEM) tương ứng với public key đã add vào VPS |

> Lưu ý: `VPS_SSH_KEY` là **nguyên file private key** (kể cả 2 dòng `-----BEGIN/END...-----`), không phải đường dẫn.

---

## 🖥 Setup VPS lần đầu

Làm các bước này **một lần** trên VPS trước khi pipeline có thể chạy.

### 1. Cài Docker + Compose v2

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # logout/login lại để có hiệu lực
docker compose version           # phải in ra v2.x
```

### 2. Tạo SSH key cho GitHub Actions

Trên **máy local** (hoặc trên VPS rồi copy private key về máy):

```bash
ssh-keygen -t ed25519 -C "gh-actions" -f ~/.ssh/todo_deploy
# → tạo ra todo_deploy (private) và todo_deploy.pub (public)
```

Trên **VPS**, add public key:

```bash
cat todo_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Dán nội dung **private key** (`todo_deploy`) vào GitHub Secret `VPS_SSH_KEY`.

### 3. Clone repo về VPS

Pipeline kỳ vọng repo nằm ở `/root/todo-web` (xem [deploy.yml:23](.github/workflows/deploy.yml#L23)).

```bash
cd /root
git clone https://github.com/<your-username>/Todo-Web.git todo-web
cd todo-web/infrastructure
cp .env.prod.example .env.prod
# Edit .env.prod: đổi POSTGRES_PASSWORD, JWT_SECRET sang giá trị thật
# JWT_SECRET có thể sinh bằng: openssl rand -base64 48
```

### 4. Mở port

- `80` (HTTP) — bắt buộc để FE Nginx serve ra ngoài.
- `22` (SSH) — cho GitHub Actions SSH vào.
- (Tuỳ chọn) `443` nếu sau này thêm HTTPS (Let's Encrypt / Caddy / Traefik).

### 5. Build & start lần đầu

```bash
cd /root/todo-web/infrastructure
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Truy cập `http://<VPS_HOST>/` → app chạy.

Từ giờ, mỗi `git push origin main` sẽ tự động deploy lại.

---

## 🧰 Makefile — Lệnh thường dùng

[infrastructure/Makefile](infrastructure/Makefile) gom sẵn các lệnh hay dùng cho cả **dev** và **prod**.

### Dev (chạy local)

```bash
make up           # start dev stack (foreground)
make up-d         # start detached
make down         # stop, giữ data
make down-v       # stop + xoá data Postgres
make logs-be      # tail backend log
make shell-db     # mở psql trong container postgres
make rebuild      # build lại từ đầu (no-cache)
```

### Prod (chạy trên VPS hoặc smoke-test local)

```bash
make prod-up        # build + start detached
make prod-up-fg     # foreground để xem startup errors
make prod-logs      # tail toàn bộ log
make prod-ps        # liệt kê service đang chạy
make prod-deploy    # git pull + rebuild + restart + prune
```

Xem `make help` để biết toàn bộ target.

---

## 🔐 Bảo mật & best practices

- **KHÔNG commit** `.env`, `.env.prod`, hay bất kỳ file chứa secret nào — đã được [.gitignore](.gitignore).
- JWT secret sinh bằng: `openssl rand -base64 48`.
- Postgres password ở prod **không được trùng dev** (`postgres/postgres`).
- Container Postgres ở prod **không expose port** ra host — chỉ truy cập qua Docker network nội bộ. Muốn kết nối DB từ ngoài để debug, dùng SSH tunnel.
- Khi rotate secret: cập nhật `.env.prod` trên VPS rồi `make prod-restart`.

---

## 🧪 API quick reference

Swagger UI: `http://<host>:5001/api-docs` (dev) hoặc `http://<host>/api-docs` (prod).

| Method | Endpoint              | Mô tả                         |
| ------ | --------------------- | ----------------------------- |
| POST   | `/api/auth/register`  | Đăng ký user mới              |
| POST   | `/api/auth/login`     | Đăng nhập → trả về JWT        |
| GET    | `/api/tasks`          | Lấy danh sách task của user   |
| POST   | `/api/tasks`          | Tạo task mới                  |
| PUT    | `/api/tasks/:id`      | Cập nhật task                 |
| DELETE | `/api/tasks/:id`      | Xoá task                      |
| GET    | `/health`             | Health check                  |

---

## 🐛 Troubleshooting

| Triệu chứng                              | Nguyên nhân thường gặp                                            | Cách xử lý                                                     |
| ---------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `port 80 is already allocated`           | Có service khác (Apache/Nginx) đang chiếm 80                      | Đổi `HTTP_PORT=8080` trong `.env.prod`, hoặc dừng service kia  |
| FE load nhưng API 404 / CORS             | Nginx chưa proxy được `/api` → BE chưa khởi động hoặc sai network | `make prod-logs-be`, `make prod-logs-fe`                       |
| GH Actions fail ở bước SSH               | `VPS_SSH_KEY` sai format, hoặc public key chưa add vào VPS        | Test thủ công: `ssh -i todo_deploy user@host`                  |
| Build chậm / hết disk trên VPS           | Image cũ chất đống                                                | Pipeline đã có `docker image prune -f`. Chạy thêm `docker system prune -af` nếu cần |
| DB reset / mất data sau khi `down -v`    | `-v` xoá volume `pgdata`                                          | Đừng dùng `down -v` ở prod. Backup volume trước khi nâng cấp   |

---

## 📌 Roadmap

- [ ] HTTPS tự động bằng Caddy / Traefik + Let's Encrypt
- [ ] Build & push Docker image lên registry (GHCR) thay vì build trên VPS
- [ ] Health-check + rollback tự động trong pipeline
- [ ] Tách job test (lint + unit test) chạy trước khi deploy
- [ ] Backup Postgres định kỳ ra object storage (S3 / R2)

---

## 👨‍💻 Author

**Truong Nguyen Bao Khang** — practice project học full-stack + DevOps cơ bản.
