#!/bin/bash
set -e

echo "================================================"
echo "Smart Mid-Day Meal System - AWS EC2 Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}Step 2: Installing system dependencies...${NC}"
apt install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    git \
    curl \
    build-essential \
    libpq-dev \
    python3.11-dev \
    libopencv-dev \
    cmake

# Install Node.js 18.x
echo -e "${GREEN}Step 3: Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installations
echo -e "${GREEN}Verifying installations...${NC}"
python3.11 --version
node --version
npm --version
psql --version

# Setup PostgreSQL
echo -e "${GREEN}Step 4: Setting up PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE midday_meal_db;
CREATE USER meal_admin WITH PASSWORD 'ChangeMeInProduction123!';
ALTER DATABASE midday_meal_db OWNER TO meal_admin;
GRANT ALL PRIVILEGES ON DATABASE midday_meal_db TO meal_admin;
\c midday_meal_db
CREATE EXTENSION IF NOT EXISTS vector;
EOF

echo -e "${GREEN}Step 5: Creating application directory...${NC}"
mkdir -p /opt/midday-meal
cd /opt/midday-meal

# Clone repository (user needs to provide repo URL)
echo -e "${YELLOW}Repository cloning step - please clone your repository manually:${NC}"
echo "git clone YOUR_REPO_URL /opt/midday-meal"
echo ""
read -p "Press Enter after you've cloned the repository..."

# Setup backend
echo -e "${GREEN}Step 6: Setting up Python backend...${NC}"
cd /opt/midday-meal/backend

python3.11 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
echo -e "${GREEN}Step 7: Creating environment configuration...${NC}"
cat > .env <<EOF
DATABASE_URL=postgresql://meal_admin:ChangeMeInProduction123!@localhost:5432/midday_meal_db
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
PROJECT_NAME=Smart Mid-Day Meal System
VERSION=1.0.0
API_V1_STR=/api/v1
EOF

echo -e "${YELLOW}Please edit /opt/midday-meal/backend/.env with your production settings${NC}"

# Run database migrations
echo -e "${GREEN}Step 8: Running database migrations...${NC}"
alembic upgrade head

# Create systemd service for backend
echo -e "${GREEN}Step 9: Creating systemd service...${NC}"
cat > /etc/systemd/system/midday-meal-backend.service <<EOF
[Unit]
Description=Mid-Day Meal Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/midday-meal/backend
Environment="PATH=/opt/midday-meal/backend/venv/bin"
ExecStart=/opt/midday-meal/backend/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Setup frontend
echo -e "${GREEN}Step 10: Building frontend...${NC}"
cd /opt/midday-meal/frontend-new

# Create production .env
cat > .env <<EOF
VITE_API_URL=http://YOUR_DOMAIN_OR_IP:8000/api/v1
EOF

echo -e "${YELLOW}Please edit /opt/midday-meal/frontend-new/.env with your backend URL${NC}"

npm install
npm run build

# Setup Nginx
echo -e "${GREEN}Step 11: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/midday-meal <<'EOF'
# Backend API
server {
    listen 8000;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase timeout for face recognition
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;
}

# Frontend
server {
    listen 80;
    server_name _;

    root /opt/midday-meal/frontend-new/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    # Upload files
    location /uploads/ {
        alias /opt/midday-meal/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/midday-meal /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Create uploads directory
mkdir -p /opt/midday-meal/backend/uploads
chown -R www-data:www-data /opt/midday-meal

# Start services
echo -e "${GREEN}Step 12: Starting services...${NC}"
systemctl daemon-reload
systemctl enable midday-meal-backend
systemctl start midday-meal-backend
systemctl restart nginx

# Setup firewall (UFW)
echo -e "${GREEN}Step 13: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw --force enable

# Check service status
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Backend service status:"
systemctl status midday-meal-backend --no-pager
echo ""
echo "Nginx status:"
systemctl status nginx --no-pager
echo ""
echo -e "${GREEN}Access your application:${NC}"
echo "Frontend: http://YOUR_SERVER_IP"
echo "Backend API: http://YOUR_SERVER_IP:8000/docs"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update /opt/midday-meal/backend/.env with production settings"
echo "2. Update /opt/midday-meal/frontend-new/.env with your domain"
echo "3. Rebuild frontend: cd /opt/midday-meal/frontend-new && npm run build"
echo "4. Setup SSL certificate (recommended - use certbot)"
echo "5. Run seed data: cd /opt/midday-meal/backend && source venv/bin/activate && python seed.py"
echo ""
echo -e "${GREEN}Logs:${NC}"
echo "Backend: journalctl -u midday-meal-backend -f"
echo "Nginx: tail -f /var/log/nginx/error.log"
