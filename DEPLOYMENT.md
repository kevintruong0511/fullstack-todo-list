# Deployment Guide — fullstack-todo-list

Tài liệu hoàn chỉnh để deploy app này lên VPS production, từ lúc mua VPS cho tới khi CI/CD auto-deploy.

> **Stack:** React (Vite) + Express + PostgreSQL, đóng gói bằng Docker, serve qua Nginx, deploy lên Ubuntu VPS, CI/CD bằng GitHub Actions.

---

## Mục lục

- [1. Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
- [2. Setup VPS lần đầu](#2-setup-vps-lần-đầu)
- [3. Deploy lần đầu (thủ công)](#3-deploy-lần-đầu-thủ-công)
- [4. Setup CI/CD (GitHub Actions)](#4-setup-cicd-github-actions)
- [5. Workflow hằng ngày](#5-workflow-hằng-ngày)
- [6. Troubleshooting](#6-troubleshooting)
- [7. Quick reference](#7-quick-reference)

---

## 1. Tổng quan kiến trúc

### Luồng deploy

```
Bạn code trên Mac
      │
      │ git push origin main
      ▼
GitHub repo
      │
      │ trigger .github/workflows/deploy.yml
      ▼
GitHub Actions runner
      │
      │ SSH bằng key chuyên dụng vào VPS
      ▼
VPS: git pull + docker compose up -d --build
      │
      ▼
Web mới live tại http://<IP_VPS>
```

### Kiến trúc runtime trên VPS

```
                  Internet
                     │
                http://<IP>:80
                     │
                     ▼
       ┌─────────────────────────────┐
       │  fe  (Nginx, serve static)  │  ← chỉ container này expose ra ngoài
       └──┬──────────────────────────┘
          │ proxy /api/* → be:5000
          ▼
       ┌─────────────────────────────┐
       │  be  (Express, port 5000)   │  ← chỉ accessible nội bộ
       └──┬──────────────────────────┘
          │ pg client → postgres:5432
          ▼
       ┌─────────────────────────────┐
       │  postgres  (port 5432)      │  ← chỉ accessible nội bộ
       └─────────────────────────────┘
              │
              ▼
       Named volume `pgdata` (data persistent qua restart)
```

3 service đều trong **Docker network mặc định** của compose, resolve bằng service name (`be`, `postgres`, `fe`).

### Files chính

| File | Vai trò |
|---|---|
| [infrastructure/docker-compose.prod.yml](infrastructure/docker-compose.prod.yml) | Compose production: 3 service, chỉ expose port 80 |
| [infrastructure/docker/be.prod.Dockerfile](infrastructure/docker/be.prod.Dockerfile) | BE: `npm ci --omit=dev` + `node server.js` |
| [infrastructure/docker/fe.prod.Dockerfile](infrastructure/docker/fe.prod.Dockerfile) | FE: multi-stage Vite build → Nginx serve |
| [infrastructure/docker/nginx.conf](infrastructure/docker/nginx.conf) | SPA fallback + proxy `/api/` → backend |
| [infrastructure/.env.prod.example](infrastructure/.env.prod.example) | Template env (copy thành `.env.prod` trên VPS) |
| [infrastructure/Makefile](infrastructure/Makefile) | Shortcut: `make prod-up`, `prod-logs`, `prod-deploy`, ... |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | GitHub Actions: auto-deploy khi push lên `main` |

---

## 2. Setup VPS lần đầu

Phần này **chỉ làm 1 lần** khi mới mua VPS.

### 2.1. Mua VPS

**Cấu hình tối thiểu khuyến nghị:**
- CPU: 1 vCPU
- RAM: **2 GB** (1GB sẽ OOM lúc `vite build`)
- Disk: 20–40 GB SSD
- OS: **Ubuntu 22.04 hoặc 24.04 LTS**
- Location: HN hoặc HCM (cho user VN)

**Setup lúc mua (trên trang nhà cung cấp):**
- Tự động Backup: **Tắt** (tốn 20% phí, không cần cho practice)
- Enable IPv6: **Bật** (thường free)
- Private Network/VPC: **Tắt** (chỉ cần khi có nhiều VPS)
- **SSH Key: paste public key của Mac** (lấy từ `cat ~/.ssh/id_ed25519.pub` — tạo trước bằng `ssh-keygen -t ed25519` nếu chưa có)
- Số lượng: 1
- Tên máy chủ: tự đặt, vd `vps-todo`

Sau khi mua: nhận **IP public** qua email/dashboard.

### 2.2. SSH lần đầu vào VPS

Trên Mac:
```bash
ssh root@<IP_VPS>
```
Lần đầu hỏi `yes/no` → `yes`. Vào thẳng prompt root nhờ SSH key đã add lúc mua.

### 2.3. Update hệ thống

```bash
apt update && apt upgrade -y
```

### 2.4. Khoá SSH (chỉ cho phép login bằng key)

```bash
nano /etc/ssh/sshd_config
```

Sửa 2 dòng (xoá `#` đầu nếu có):
```
PermitRootLogin prohibit-password
PasswordAuthentication no
```

> `prohibit-password` = root vẫn login được nhưng **chỉ qua SSH key**, chặn password.

Áp dụng:
```bash
systemctl restart ssh
```

**Verify** từ terminal Mac mới (đừng đóng terminal hiện tại):
```bash
ssh root@<IP_VPS>   # phải vào được bằng key
```
Vào được → password đã hoàn toàn vô hiệu.

### 2.5. Firewall (UFW)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

### 2.6. Cài Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
docker run --rm hello-world   # verify
```

### 2.7. Tạo swap 2GB (insurance khi `vite build` ngốn RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h   # phải thấy Swap: 2.0Gi
```

### 2.8. Cài make

```bash
apt install -y make
```

### 2.9. Config git identity (chỉ để tránh warning khi pull)

```bash
git config --global user.name "Truong Nguyen Bao Khang"
git config --global user.email "khangbixanh051107@gmail.com"
```

---

## 3. Deploy lần đầu (thủ công)

### 3.1. Clone repo

```bash
cd /root
git clone https://github.com/kevintruong0511/fullstack-todo-list.git
cd fullstack-todo-list
```

> Folder sẽ là `/root/fullstack-todo-list`. Đường dẫn này phải khớp với workflow deploy.yml.

### 3.2. Tạo `.env.prod`

```bash
cd infrastructure
cat > .env.prod <<EOF
POSTGRES_USER=todo_user
POSTGRES_PASSWORD=$(openssl rand -base64 24)
POSTGRES_DB=todo_db
JWT_SECRET=$(openssl rand -base64 48)
JWT_EXPIRES_IN=7d
HTTP_PORT=80
EOF

cat .env.prod   # verify
```

> `.env.prod` đã gitignored — file này chỉ tồn tại trên VPS, không bao giờ vào repo.

### 3.3. Build & start stack

```bash
make prod-up
```

Lần đầu mất **5–10 phút** (build FE + BE từ đầu, RAM căng nhờ swap đỡ). Xem log real-time:
```bash
make prod-logs
```

Khi thấy `Server is running on http://localhost:5000` → stack đã chạy. Ctrl+C thoát log.

Verify:
```bash
make prod-ps   # 3 service Up, postgres (healthy)
```

### 3.4. Test từ browser

Mở `http://<IP_VPS>` trên Mac. Web React phải load, request `/api/...` trả 200/401 (không phải lỗi CORS/502).

---

## 4. Setup CI/CD (GitHub Actions)

Phần này **chỉ làm 1 lần** sau khi deploy thủ công đã chạy ổn.

### 4.1. Tạo SSH key chuyên dụng cho CI (trên Mac)

Tách biệt với key cá nhân để dễ revoke độc lập:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/todo_deploy_ci -N "" -C "github-actions-todo"
```

Tạo ra 2 file:
- `~/.ssh/todo_deploy_ci` — private (paste vào GitHub Secret)
- `~/.ssh/todo_deploy_ci.pub` — public (paste vào VPS)

### 4.2. Add public key vào VPS

Cách nhanh:
```bash
cat ~/.ssh/todo_deploy_ci.pub | ssh root@<IP_VPS> "cat >> ~/.ssh/authorized_keys"
```

Verify từ Mac:
```bash
ssh -i ~/.ssh/todo_deploy_ci root@<IP_VPS> 'echo CI key OK'
```
In `CI key OK` không hỏi gì → OK.

### 4.3. Add 3 secrets vào GitHub

Vào **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**, tạo:

| Name | Value |
|---|---|
| `VPS_HOST` | `<IP_VPS>` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Toàn bộ nội dung file `~/.ssh/todo_deploy_ci` (gồm cả dòng `BEGIN`/`END`) |

⚠️ **Khi paste `VPS_SSH_KEY`**: dùng `cat ~/.ssh/todo_deploy_ci \| pbcopy` rồi Cmd+V — paste tay dễ mất newline → GitHub sẽ báo `ssh: no key found`.

### 4.4. Workflow file

File đã có sẵn tại [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Triggers:
- Push lên branch `main` → tự deploy
- `workflow_dispatch` → trigger thủ công từ tab Actions

Lệnh nó chạy trên VPS:
```bash
cd /root/fullstack-todo-list
git pull origin main
cd infrastructure
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker image prune -f
```

### 4.5. Trigger run đầu tiên

```bash
# Trên Mac
git add .github/workflows/deploy.yml
git commit -m "ci: add auto-deploy"
git push origin main
```

Xem tại `https://github.com/kevintruong0511/fullstack-todo-list/actions`.

---

## 5. Workflow hằng ngày

Sau khi setup xong, deploy chỉ còn 1 lệnh:

```bash
# Trên Mac, tại folder repo
git add .
git commit -m "feat: thêm tính năng X"
git push origin main
```

Workflow tự chạy → 2–5 phút sau web update.

**Monitor:**
- Tab Actions trên GitHub: log real-time
- Email notification khi fail (bật tại https://github.com/settings/notifications)

**Trigger lại workflow không cần commit:**
- Tab Actions → workflow "Deploy to VPS" → nút "Run workflow" góc phải

---

## 6. Troubleshooting

### Workflow fail ngay (~10s) với `ssh: no key found`
Private key trong secret `VPS_SSH_KEY` sai format. Re-paste bằng `pbcopy`:
```bash
cat ~/.ssh/todo_deploy_ci | pbcopy
```
Rồi update secret trên GitHub.

### Workflow fail ngay với `Permission denied (publickey)`
Public key chưa add đúng vào `~/.ssh/authorized_keys` của VPS. Verify:
```bash
ssh root@<IP_VPS> 'cat ~/.ssh/authorized_keys'
```
Phải có dòng key `github-actions-todo`. Nếu thiếu → quay lại bước 4.2.

### `cd: /***/...: No such file or directory`
Đường dẫn folder trong workflow không khớp với folder trên VPS. Sửa dòng `cd /root/fullstack-todo-list` trong [.github/workflows/deploy.yml](.github/workflows/deploy.yml) đúng path.

> GitHub mask `root` thành `***` trong log vì `VPS_USER=root` là secret. Đọc `/***/fullstack-todo-list` = `/root/fullstack-todo-list`.

### Build timeout sau 15 phút
Tăng `command_timeout: 30m` trong workflow.

### `docker compose up` báo `unhealthy` ở postgres
Check log postgres:
```bash
ssh root@<IP_VPS> 'cd /root/fullstack-todo-list/infrastructure && make prod-logs-db'
```
Thường do `.env.prod` thiếu biến hoặc DB credentials sai.

### Web load nhưng API trả 502
Backend container crash. Check:
```bash
make prod-logs-be
```
Hay gặp: `.env.prod` thiếu `JWT_SECRET`, hoặc BE không connect được Postgres.

### Out of memory khi build
Swap đang full hoặc chưa có. Kiểm tra:
```bash
free -h
```
Nếu Swap = 0 → quay lại bước 2.7 tạo swap.

### `git pull` đòi credentials trong workflow
Repo private + chưa cache PAT trên VPS. SSH vào VPS và pull thủ công 1 lần:
```bash
ssh root@<IP_VPS>
cd /root/fullstack-todo-list
git config --global credential.helper store
git pull origin main   # nhập PAT khi hỏi, sẽ được lưu
```

---

## 7. Quick reference

### Lệnh Makefile (chạy trong `/root/fullstack-todo-list/infrastructure/`)

| Lệnh | Tác dụng |
|---|---|
| `make prod-up` | Start stack (build + detached) |
| `make prod-down` | Stop stack (giữ data) |
| `make prod-logs` | Tail log tất cả service |
| `make prod-logs-be` / `-fe` / `-db` | Tail log 1 service |
| `make prod-ps` | List service đang chạy |
| `make prod-shell-be` / `-fe` / `-db` | Vào shell container (psql cho db) |
| `make prod-restart` | Restart tất cả service |
| `make prod-rebuild` | Build lại không cache |
| `make prod-deploy` | git pull + rebuild + prune (chạy trên VPS) |

### SSH shortcuts

Thêm vào `~/.ssh/config` trên Mac:
```
Host todo-vps
    HostName <IP_VPS>
    User root
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 60
```

Sau đó:
- Terminal: `ssh todo-vps`
- VSCode: `Cmd+Shift+P` → `Remote-SSH: Connect to Host` → `todo-vps`

### Backup database (manual)

```bash
ssh root@<IP_VPS>
cd /root/fullstack-todo-list/infrastructure
docker compose -f docker-compose.prod.yml --env-file .env.prod exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > ~/backup-$(date +%Y%m%d).sql
```

### Restore database

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB" < ~/backup-YYYYMMDD.sql
```

### URLs

| Resource | URL |
|---|---|
| Web app | `http://<IP_VPS>` |
| GitHub repo | https://github.com/kevintruong0511/fullstack-todo-list |
| GitHub Actions | https://github.com/kevintruong0511/fullstack-todo-list/actions |
| GitHub Secrets | https://github.com/kevintruong0511/fullstack-todo-list/settings/secrets/actions |

---

## Out of scope (làm sau)

- **Domain + HTTPS**: mua domain, trỏ DNS A record → IP, thêm Certbot/nginx-proxy-companion → HTTPS qua Let's Encrypt
- **Backup tự động**: cron job `pg_dump` + upload sang S3/Drive
- **Monitoring**: Uptime Robot (free) ping endpoint mỗi 5 phút
- **CI checks trước deploy**: thêm job `lint` chạy `eslint` trước job `deploy`
- **Staging environment**: VPS thứ 2 cho branch `develop`
- **Database migrations**: hiện đang dựa vào `initPostgres` chạy lúc start. Khi schema phức tạp → dùng tool như `node-pg-migrate` hoặc `knex migrate`
