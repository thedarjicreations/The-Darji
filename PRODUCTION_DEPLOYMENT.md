# 🚀 Enterprise Deployment Guide (Professional Setup)

This guide outlines the **best, most professional way** to deploy "The Darji" so it is accessible from anywhere, on any device, with enterprise-grade performance and reliability.

**Architecture:**
*   **Frontend (Client):** Deployed on **Vercel**.
    *   *Why?* Vercel provides a global Content Delivery Network (CDN), making your app load instantly anywhere in the world. It integrates perfectly with your React/Vite setup.
*   **Backend (Server):** Deployed on **Railway** (or Render).
    *   *Why?* Railway offers robust, scalable server hosting that keeps your API running 24/7. It connects securely to your database and storage.
*   **Database:** MongoDB Atlas (Already configured).
*   **Storage:** AWS S3 (Already configured).

---

## 📋 Prerequisites

1.  **GitHub Account:** Push your code to a GitHub repository.
2.  **Vercel Account:** Sign up at [vercel.com](https://vercel.com).
3.  **Railway Account:** Sign up at [railway.app](https://railway.app).

---

## 🛠️ Step 1: Push Code to GitHub

Ensure your latest code is pushed to a fresh GitHub repository.
```bash
git init
git add .
git commit -m "Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/the-darji-app.git
git push -u origin main
```

---

## 🚆 Step 2: Deploy Backend (Railway)

1.  **New Project:** Go to Railway Dashboard -> "New Project" -> "Deploy from GitHub repo".
2.  **Select Repo:** Choose `the-darji-app`.
3.  **Root Directory:**
    *   Railway usually detects the root. If asked for a "Root Directory", keep it as `/` (root).
    *   It will automatically detect `package.json` starts the server.
4.  **Variables:** Go to the "Variables" tab in your new service and add:
    *   `NODE_ENV`: `production`
    *   `PORT`: `5000` (or `PORT` variable will be provided by Railway automatically, code handles it)
    *   `MONGODB_URI`: (Copy from your `.env`)
    *   `JWT_SECRET`: (Copy from your `.env`)
    *   `AWS_ACCESS_KEY_ID`: (Copy from your `.env`)
    *   `AWS_SECRET_ACCESS_KEY`: (Copy from your `.env`)
    *   `AWS_REGION`: `ap-south-1` (or your region)
    *   `AWS_S3_BUCKET`: `thedarji-uploads`
5.  **Build Command:** `npm install`
6.  **Start Command:** `npm start` (or `node server/index.js`)
7.  **Generate Domain:** Go to "Settings" -> "Networking" -> "Generate Domain".
    *   Example: `https://the-darji-production.up.railway.app`
    *   **Copy this URL.** You will need it for the frontend.

---

## ▲ Step 3: Deploy Frontend (Vercel)

1.  **New Project:** Go to Vercel Dashboard -> "Add New..." -> "Project".
2.  **Import Repo:** Select `the-darji-app` from GitHub.
3.  **Configure Project:**
    *   **Framework Preset:** Vite (should auto-detect).
    *   **Root Directory:** Click "Edit" and select `client`. **(Important!)**
4.  **Environment Variables:** Add the following:
    *   `VITE_API_URL`: Paste your Railway Backend URL (e.g., `https://the-darji-production.up.railway.app`)
        *   *Note: Do not add a trailing slash `/`.*
5.  **Deploy:** Click "Deploy".
6.  **Success!** Vercel will build your app and give you a live URL (e.g., `https://the-darji-app.vercel.app`).

---

## 🔄 Step 4: Final Connection

1.  **Update Backend CORS:**
    *   Go back to **Railway** -> Variables.
    *   Add/Update `FRONTEND_URL` to match your new Vercel domain (e.g., `https://the-darji-app.vercel.app`).
    *   Railway will automatically redeploy the backend with the new permission.

2.  **Verify:**
    *   Open your Vercel URL on your phone/laptop.
    *   Log in and check valid API connection.

---

## 📱 Using as a Mobile App (PWA)

Since we configured PWA (Progressive Web App) features:
1.  Open the Vercel link on Chrome (Android) or Safari (iOS).
2.  Tap "Share" -> "Add to Home Screen".
3.  It will install as a standalone app icon on your device!

---
