# ⚡ CFA Rapid Doubts | Theta X Research

AI-powered CFA Level 1 tutor with topic filtering, quick prompts, and Indian market examples.

Built with React + Express + Claude API.

---

## Project Structure

```
cfa-rapid-doubts/
├── server/
│   └── index.js          # Express backend (API proxy, serves static build)
├── src/
│   ├── main.jsx          # React entry point
│   └── App.jsx           # Main app component
├── public/
│   └── favicon.svg       # App icon
├── index.html            # HTML entry
├── vite.config.js        # Vite build config
├── package.json          # Dependencies & scripts
├── .env.example          # Environment variable template
├── .gitignore
└── README.md
```

## Architecture

```
Browser  →  Express Server (:3001)  →  Anthropic API
                  ↓
         Serves React build (dist/)
```

Your API key NEVER touches the browser. The Express server proxies all requests to Anthropic, keeping your key server-side only.

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 3. Run in development mode

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API server (port 3001) concurrently. Open `http://localhost:5173`.

---

## AWS Deployment (EC2)

### Step 1: Build the app

```bash
npm run build
```

This creates the `dist/` folder with the optimized React build.

### Step 2: SSH into your EC2 instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 3: Install Node.js on EC2

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # Should show v20.x
npm -v
```

### Step 4: Upload the project

**Option A: Git clone**
```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/cfa-rapid-doubts.git
cd cfa-rapid-doubts
```

**Option B: SCP the zip**
```bash
# From your local machine:
scp -i your-key.pem cfa-rapid-doubts.zip ubuntu@your-ec2-ip:/home/ubuntu/

# On EC2:
cd /home/ubuntu
unzip cfa-rapid-doubts.zip
cd cfa-rapid-doubts
```

### Step 5: Install dependencies and build

```bash
npm install
npm run build
```

### Step 6: Create .env on the server

```bash
cp .env.example .env
nano .env
```

Set your values:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
NODE_ENV=production
MODEL=claude-sonnet-4-20250514
ALLOWED_ORIGINS=http://your-ec2-ip:3001,https://yourdomain.com
```

### Step 7: Start the server

**Quick start:**
```bash
npm start
```

**Production (with PM2 process manager — recommended):**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app
pm2 start server/index.js --name cfa-doubts

# Auto-restart on reboot
pm2 startup
pm2 save

# Useful PM2 commands:
pm2 status          # Check status
pm2 logs cfa-doubts # View logs
pm2 restart cfa-doubts  # Restart
pm2 stop cfa-doubts     # Stop
```

### Step 8: Configure Nginx (reverse proxy)

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/cfa-doubts
```

Paste this config:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your EC2 public IP

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/cfa-doubts /etc/nginx/sites-enabled/
sudo nginx -t       # Test config
sudo systemctl restart nginx
```

### Step 9: Open firewall

```bash
# If using ufw:
sudo ufw allow 80
sudo ufw allow 443

# Also ensure your EC2 Security Group allows:
# - Port 80 (HTTP) from 0.0.0.0/0
# - Port 443 (HTTPS) from 0.0.0.0/0
```

### Step 10 (Optional): Add HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Certbot auto-configures Nginx for HTTPS and sets up auto-renewal.

---

## EC2 Security Group Settings

Make sure your EC2 instance's security group has these inbound rules:

| Type  | Port | Source    | Purpose       |
|-------|------|-----------|---------------|
| SSH   | 22   | Your IP   | SSH access    |
| HTTP  | 80   | 0.0.0.0/0 | Web traffic   |
| HTTPS | 443  | 0.0.0.0/0 | Secure traffic |

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev (client + server)

# Production
npm run build            # Build React frontend
npm start                # Start production server

# PM2 (production)
pm2 start server/index.js --name cfa-doubts
pm2 restart cfa-doubts
pm2 logs cfa-doubts
pm2 status
```

---

## Features

- 🎯 **Topic filtering** across all 10 CFA L1 areas
- ⚡ **Quick prompts** per topic (40+ pre-loaded questions)
- 🇮🇳 **Indian market examples** (₹, NSE, BSE, Nifty, RBI)
- 🔒 **API key stays server-side** (Express proxy)
- 🛡️ **Rate limiting** (30 req/min) + Helmet security
- 💬 **Conversation context** (follows up on previous answers)
- 🌙 **Dark terminal aesthetic** (Theta X brand)

---

## Built by Theta X Research | CFA L1 Aug 2026
