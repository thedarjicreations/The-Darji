# 🏭 Mission-Critical "Industry Standard" Deployment Guide

You requested an **industry-level** setup. This guide pivots from managed services (Vercel/Railway) to **Dedicated Infrastructure (AWS/DigitalOcean)** using **Docker**.

**This gives you:**
*   **Data Sovereignty:** You own the machine. No shared runtime limits.
*   **Crucial Reliability:** A dedicated Linux server (VPS) running your precise Docker environment 24/7.
*   **Total Control:** You can scale CPU/RAM vertically as needed.

---

## 🏗️ Architecture: The "Titan" Stack

*   **Server:** AWS EC2 (t3.small or medium) OR DigitalOcean Droplet (2GB+ RAM).
*   **OS:** Ubuntu 22.04 LTS (Industry Standard).
*   **Containerization:** Docker & Docker Compose (Portability).
*   **Database:** MongoDB Atlas (Dedicated Cluster Recommended).
*   **Reverse Proxy:** Nginx (Handles SSL/HTTPS & Security Headers).

---

## 🛠️ Step 1: Provision Your Server (DigitalOcean Example)

1.  **Create Droplet:**
    *   **Region:** Bangalore (`blr1`) - *Closest to you for best response time.*
    *   **Image:** Docker on Ubuntu 22.04 can be selected from "Marketplace" (saves install time) OR plain Ubuntu 22.04.
    *   **Size:** 2 GB RAM / 1 CPU ($12/mo) minimum for production reliability.

2.  **Access:**
    *   `ssh root@YOUR_SERVER_IP`

---

## 🔒 Step 2: Security Hardening (Crucial)

Before deploying code, secure the "house".

```bash
# 1. Update System
apt update && apt upgrade -y

# 2. Setup Firewall (UFW) - Only open necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh     # Port 22
ufw allow http    # Port 80
ufw allow https   # Port 443
ufw enable
```

---

## 📦 Step 3: Deploy via Docker

Your project is **already Docker-ready**. We verified your `docker-compose.yml`, `server/Dockerfile`, and `client/Dockerfile`. They are production-perfect (multi-stage builds, non-root users, security headers).

1.  **Clone Your Repo:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/the-darji-app.git /opt/darji
    cd /opt/darji
    ```

2.  **Configure Secrets:**
    *   *Never* commit `.env` to Git. Create it on the server manually.
    ```bash
    nano .env.production
    ```
    *   Paste your production values (MongoDB URI, AWS Keys, JWT Secret).

3.  **Launch:**
    ```bash
    docker compose up -d --build
    ```
    *   This pulls the latest node images, builds your React frontend into static HTML, and starts the Node.js backend.
    *   It automatically sets up the internal network between them.

---

## 🌐 Step 4: Domain & SSL (HTTPS)

You cannot have "crucial data" without HTTPS.

1.  **DNS:** Point your domain (e.g., `app.thedarji.com`) to your Server IP.
2.  **Nginx Proxy Manager (Easiest Industry Tool):**
    *   Instead of manual Nginx configs, we can run Nginx Proxy Manager in Docker alongside your app to handle SSL auto-renewal.
    *   *Alternatively*, use the `nginx.conf` we reviewed in your client folder which is already configured for security headers.

3.  **Certbot (Manual SSL):**
    ```bash
    # If running Nginx on host
    apt install python3-certbot-nginx
    certbot --nginx -d app.thedarji.com
    ```

---

## 💾 Step 5: Backup Strategy (Data Integrity)

For "crucial data", standard hosting isn't enough. You need **Point-in-Time Recovery**.

1.  **Database:** Enable "Cloud Backups" in MongoDB Atlas. It allows you to restore to *any second* in the past 7 days.
2.  **Files (S3):** Enable "Versioning" on your AWS S3 bucket. If a file is accidentally deleted, you can undelete it.

---

## ✅ Why This is "Industry Level"

1.  **Immutable Infrastructure:** By using Docker, your app works exactly the same on your laptop, the testing server, and this production server. No "it works on my machine" bugs.
2.  **Zero-Downtime potential:** You can spin up a second server, put a Load Balancer in front, and achieve High Availability.
3.  **Performance:** No shared tenant 'noisy neighbor' issues like on cheap shared hosting. You have dedicated CPU/RAM.

This setup is what startups use before they scale to Kubernetes. It is robust, professional, and reliable.
