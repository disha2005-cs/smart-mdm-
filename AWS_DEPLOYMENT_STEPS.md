# Complete AWS EC2 Deployment Guide - Step by Step

## Part 1: Create EC2 Instance

### Step 1: Launch EC2 Instance

1. **Go to EC2 Dashboard**
   - In AWS Console search bar, type "EC2" and click on EC2 service
   - Click "Launch Instance" button (orange button)

2. **Configure Instance Settings**

   **Name and tags:**
   ```
   Name: midday-meal-server
   ```

   **Application and OS Images (AMI):**
   - Select: **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
   - Architecture: **64-bit (x86)**
   - AMI ID: ami-0e2c8caa4b6378d8c (or latest Ubuntu 22.04 in your region)

   **Instance type:**
   - Select: **t2.medium** (minimum recommended)
   - vCPUs: 2, Memory: 4 GiB
   - Or **t2.large** (better for face recognition): vCPUs: 2, Memory: 8 GiB

   **Key pair (login):**
   - Click "Create new key pair"
   - Key pair name: `midday-meal-key`
   - Key pair type: **RSA**
   - Private key file format: **.pem** (for Linux/Mac) or **.ppk** (for PuTTY on Windows)
   - Click "Create key pair" - **SAVE THIS FILE! You'll need it to connect**

   **Network settings:**
   - Click "Edit" to configure
   - VPC: (default is fine)
   - Subnet: (default is fine)
   - Auto-assign public IP: **Enable**
   
   **Firewall (security groups):**
   - Create new security group
   - Security group name: `midday-meal-sg`
   - Description: `Security group for Mid-Day Meal System`
   
   Add these inbound rules:
   
   | Type | Protocol | Port Range | Source | Description |
   |------|----------|------------|--------|-------------|
   | SSH | TCP | 22 | 0.0.0.0/0 | SSH access |
   | HTTP | TCP | 80 | 0.0.0.0/0 | HTTP access |
   | HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS access |
   | Custom TCP | TCP | 8000 | 0.0.0.0/0 | Backend API |
   | Custom TCP | TCP | 5173 | 0.0.0.0/0 | Frontend Dev Server |

   **Configure storage:**
   - Size: **30 GiB** (minimum, increase if needed)
   - Volume type: **gp3** (General Purpose SSD)
   - Delete on termination: **Yes**

3. **Review and Launch**
   - Click "Launch instance"
   - Wait for instance to be in "Running" state (takes 1-2 minutes)

### Step 2: Get Instance Details

1. Go to **EC2 Dashboard > Instances**
2. Select your instance
3. Note down these details:
   - **Instance ID**: i-xxxxxxxxxxxxxxxxx
   - **Public IPv4 address**: XX.XX.XX.XX (e.g., 13.234.56.78)
   - **Public IPv4 DNS**: ec2-XX-XX-XX-XX.region.compute.amazonaws.com

---

## Part 2: Connect to EC2 Instance

### Option A: Connect via Browser (Easy)

1. In EC2 Dashboard, select your instance
2. Click "Connect" button at the top
3. Go to "EC2 Instance Connect" tab
4. Click "Connect" button - Opens terminal in browser
5. **Skip to Part 3**

### Option B: Connect via SSH (Local Terminal)

**For Linux/Mac/Windows (Git Bash):**

1. **Set permissions on your key file:**
   ```bash
   chmod 400 /path/to/midday-meal-key.pem
   ```

2. **Connect to instance:**
   ```bash
   ssh -i /path/to/midday-meal-key.pem ubuntu@YOUR_PUBLIC_IP
   ```
   
   Example:
   ```bash
   ssh -i ~/Downloads/midday-meal-key.pem ubuntu@13.234.56.78
   ```

3. Type "yes" when prompted about fingerprint

**For Windows (PuTTY):**

1. Open PuTTY
2. Host Name: `ubuntu@YOUR_PUBLIC_IP`
3. Connection > SSH > Auth > Credentials: Browse to your .ppk file
4. Click "Open"

---

## Part 3: Initial Server Setup

Once connected to your EC2 instance, run these commands:

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Git
```bash
sudo apt install git -y
git --version
```

### 3. Clone Your Repository
```bash
cd ~
git clone YOUR_GITHUB_REPO_URL
cd Disha_project
```

**Example:**
```bash
git clone https://github.com/yourusername/Disha_project.git
cd Disha_project
```

**OR if using HTTPS with token:**
```bash
git clone https://YOUR_TOKEN@github.com/yourusername/Disha_project.git
cd Disha_project
```

---

## Part 4: Run Automated Deployment Script

### Option 1: Full Automated Installation (Recommended)

```bash
# Make deployment script executable
chmod +x deploy/deploy-aws.sh

# Run the deployment script
sudo bash deploy/deploy-aws.sh
```

**The script will automatically:**
- Install Python 3.11, Node.js 20, PostgreSQL 15
- Install system dependencies (CMake, face recognition libraries)
- Set up Python virtual environment
- Install all backend dependencies
- Configure PostgreSQL database
- Run database migrations
- Install frontend dependencies
- Build frontend for production
- Set up systemd services
- Configure Nginx reverse proxy

**⏱️ This will take 15-25 minutes to complete.**

---

## Part 5: Manual Configuration (After Script Runs)

### 1. Configure Environment Variables

**Backend environment (.env):**
```bash
cd ~/Disha_project/backend
nano .env
```

Update these values:
```bash
# Database (script creates this, but verify)
DATABASE_URL=postgresql://meal_admin:secure_password_here@localhost:5432/midday_meal_db

# JWT Secret - CHANGE THIS!
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# CORS - Add your domain/IP
BACKEND_CORS_ORIGINS=http://YOUR_PUBLIC_IP,http://YOUR_DOMAIN.com

# Server config
PROJECT_NAME=Smart Mid-Day Meal System
API_V1_STR=/api/v1
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Frontend environment (.env):**
```bash
cd ~/Disha_project/frontend-new
nano .env
```

Update:
```bash
# Use your public IP or domain
VITE_API_URL=http://YOUR_PUBLIC_IP:8000/api/v1
```

**Save files:** Press `Ctrl+X`, then `Y`, then `Enter`

### 2. Restart Services
```bash
sudo systemctl restart midday-meal-backend
sudo systemctl restart midday-meal-frontend
sudo systemctl restart nginx
```

### 3. Check Service Status
```bash
sudo systemctl status midday-meal-backend
sudo systemctl status midday-meal-frontend
sudo systemctl status nginx
```

All should show **"active (running)"** in green.

### 4. Seed Demo Data (Optional)
```bash
cd ~/Disha_project/backend
source venv/bin/activate
python seed.py
deactivate
```

---

## Part 6: Access Your Application

### Frontend Access:
```
http://YOUR_PUBLIC_IP:5173
```

### Backend API Access:
```
http://YOUR_PUBLIC_IP:8000/docs
```

### Login Credentials:
**School Admin:**
- Email: `admin@school.com`
- Password: `admin123`

**Government Admin:**
- Email: `gov@admin.com`
- Password: `gov123`

---

## Part 7: Troubleshooting Commands

### View Logs
```bash
# Backend logs
sudo journalctl -u midday-meal-backend -f

# Frontend logs
sudo journalctl -u midday-meal-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
sudo systemctl restart midday-meal-backend
sudo systemctl restart midday-meal-frontend
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

### Check Database Connection
```bash
sudo -u postgres psql
\l  # List databases
\c midday_meal_db  # Connect to database
\dt  # List tables
\q  # Quit
```

### Check Python Installation
```bash
cd ~/Disha_project/backend
source venv/bin/activate
python -c "import fastapi, sqlalchemy, cv2, insightface; print('All imports OK')"
```

### Rebuild Frontend
```bash
cd ~/Disha_project/frontend-new
npm run build
sudo systemctl restart midday-meal-frontend
```

---

## Part 8: Optional - Set Up Domain Name

### If you have a domain (e.g., midday-meal.com):

1. **Update DNS Records:**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add **A Record**: `@ -> YOUR_PUBLIC_IP`
   - Add **A Record**: `www -> YOUR_PUBLIC_IP`
   - Add **A Record**: `api -> YOUR_PUBLIC_IP`

2. **Update Nginx Configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/midday-meal
   ```
   
   Replace `YOUR_PUBLIC_IP` with your domain name

3. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

### Enable HTTPS with Let's Encrypt (Free SSL):

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts and certificates will auto-renew.

---

## Part 9: Monitoring and Maintenance

### Check Disk Space
```bash
df -h
```

### Check Memory Usage
```bash
free -h
```

### Check Running Processes
```bash
ps aux | grep python
ps aux | grep node
```

### Database Backup
```bash
sudo -u postgres pg_dump midday_meal_db > backup_$(date +%Y%m%d).sql
```

### Update Application
```bash
cd ~/Disha_project
git pull
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
deactivate
cd ../frontend-new
npm install
npm run build
sudo systemctl restart midday-meal-backend
sudo systemctl restart midday-meal-frontend
```

---

## Quick Reference Commands

```bash
# Service management
sudo systemctl status midday-meal-backend
sudo systemctl restart midday-meal-backend
sudo systemctl stop midday-meal-backend
sudo systemctl start midday-meal-backend

# View logs in real-time
sudo journalctl -u midday-meal-backend -f
sudo journalctl -u midday-meal-frontend -f

# Check if ports are listening
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :5173

# Database access
sudo -u postgres psql midday_meal_db

# Activate Python environment
cd ~/Disha_project/backend
source venv/bin/activate
```

---

## Security Best Practices

1. **Change default passwords** immediately after first login
2. **Restrict SSH access** to your IP only in security group
3. **Set up AWS CloudWatch** for monitoring
4. **Enable automated backups** for RDS if using managed database
5. **Use AWS Secrets Manager** for production secrets
6. **Set up AWS WAF** for additional security
7. **Regular security updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Cost Optimization

- **Stop instance when not in use** (data persists on EBS volume)
- **Use t2.medium for testing**, upgrade to t2.large if needed
- **Set up billing alerts** in AWS console
- **Estimated monthly cost:**
  - t2.medium: ~$30-35/month
  - t2.large: ~$60-70/month
  - 30GB storage: ~$3/month
  - Data transfer: Variable

---

## Need Help?

If deployment fails, check:
1. `/var/log/nginx/error.log`
2. `sudo journalctl -u midday-meal-backend -n 50`
3. `~/Disha_project/backend/logs/` (if exists)
4. Security group allows ports 22, 80, 443, 8000, 5173
5. Instance has enough memory (at least 4GB for t2.medium)

**Emergency Commands:**
```bash
# Kill all Python processes
sudo pkill -9 python3

# Kill all Node processes  
sudo pkill -9 node

# Restart everything
sudo systemctl restart midday-meal-backend midday-meal-frontend nginx postgresql
```

---

## Success Checklist

- [ ] EC2 instance running
- [ ] Successfully connected via SSH
- [ ] Repository cloned
- [ ] Deployment script completed without errors
- [ ] Environment variables configured
- [ ] Services running (check with systemctl status)
- [ ] Frontend accessible at http://YOUR_IP:5173
- [ ] Backend API docs at http://YOUR_IP:8000/docs
- [ ] Can login with demo credentials
- [ ] Face recognition working (test with uploaded student photo)

🎉 **Your Smart Mid-Day Meal System is now live on AWS!**
