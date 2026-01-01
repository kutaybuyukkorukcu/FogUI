# VPS Deployment Guide with Coolify

Complete guide to deploy GenUI backend on your VPS using Coolify - a self-hosted PaaS alternative to Vercel/Heroku.

## What is Coolify?

[Coolify](https://coolify.io/) is an open-source, self-hosted platform that gives you:
- 🐳 Docker-based deployments
- 🔒 Automatic SSL certificates (Let's Encrypt)
- 🔄 Auto-deploy from GitHub/Docker registries
- 📊 Built-in monitoring & logs
- 🌐 Reverse proxy (Traefik)

---

## Phase 1: Install Coolify on VPS

### Requirements
- Ubuntu 22.04+ (or compatible Linux)
- 2GB RAM minimum (4GB recommended)
- Root/sudo access
- Domain name pointed to your VPS IP (optional but recommended)

### Installation (One Command)

SSH into your VPS and run:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This installs Docker, Docker Compose, and Coolify.

### First-Time Setup

1. Open `http://YOUR_VPS_IP:8000` in browser
2. Create admin account
3. Add your server (usually "localhost" for the same VPS)

---

## Phase 2: Connect GitHub Container Registry

### Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with scopes:
   - `read:packages`
3. Copy the token

### Add GHCR as Docker Registry in Coolify

1. In Coolify: **Sources** → **New** → **Docker Registry**
2. Configure:
   - **Name**: `GitHub Container Registry`
   - **URL**: `ghcr.io`
   - **Username**: Your GitHub username
   - **Password**: Your Personal Access Token

---

## Phase 3: Deploy GenUI Backend

### Create New Resource

1. In Coolify: **Projects** → **New Project** → "GenUI"
2. **Add Resource** → **Docker Image**
3. Configure:

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/YOUR_USERNAME/genui-poc/backend:latest` |
| **Port** | `5001` |

### Environment Variables

Add these in the **Environment Variables** section:

```
SEMANTIC_KERNEL_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here
```

### Domain & SSL (Optional but Recommended)

1. In Coolify application settings → **Domains**
2. Add: `api.yourdomain.com`
3. SSL will be auto-configured via Let's Encrypt

### Deploy

Click **Deploy** and wait for the container to start!

---

## Phase 4: Auto-Deploy on New Images

### Option A: Webhook (Recommended)

1. In Coolify: Application → **Webhooks** → Copy the webhook URL
2. In GitHub: Repo → Settings → Webhooks → Add webhook
   - **Payload URL**: Coolify webhook URL
   - **Content type**: `application/json`
   - **Events**: Select "Packages" or "Workflow runs"

### Option B: Polling

Coolify can poll the registry for new images:
1. Application → **Settings** → **Check Interval**
2. Set to `5 minutes` (or preferred interval)

---

## Verification Checklist

- [ ] Coolify installed and accessible
- [ ] GHCR connected as Docker registry
- [ ] GenUI backend deployed
- [ ] Health check passing: `curl https://api.yourdomain.com/health`
- [ ] Auto-deploy configured (webhook or polling)

---

## Alternative: Dokku (Simpler, Git-Push Deploy)

If you prefer Git-push deployments like Heroku:

```bash
# Install Dokku on VPS
wget https://dokku.com/install/v0.32.3/bootstrap.sh
sudo DOKKU_TAG=v0.32.3 bash bootstrap.sh

# Create app
dokku apps:create genui-backend

# Deploy (from your local machine)
git remote add dokku dokku@your-vps:genui-backend
git push dokku main
```

---

## Quick Reference

| Task | Command/URL |
|------|-------------|
| Coolify Dashboard | `http://YOUR_VPS_IP:8000` |
| View Logs | Coolify → Application → Logs |
| Restart Container | Coolify → Application → Restart |
| Manual Deploy | Coolify → Application → Deploy |
| Docker Image | `ghcr.io/<username>/genui-poc/backend:latest` |
