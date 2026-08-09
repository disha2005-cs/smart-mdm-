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
   - **For Free Tier:** Select **t2.micro** (Free tier eligible - 750 hours/month free)
     - vCPUs: 1, Memory: 1 GiB
     - ⚠️ May be slow for face recognition, but free!
   - **Recommended if using credits:** Select **t2.medium** or **t2.large**
     - t2.medium: vCPUs: 2, Memory: 4 GiB (~$30/month)
     - t2.large: vCPUs: 2, Memory: 8 GiB (~$60/month)
   
   💡 **With AWS Credits:** Choose t2.medium or t2.large for better performance

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
   - **For Free Tier:** Size: **30 GiB** (Free tier includes 30 GB)
   - **With Credits:** Size: **30-50 GiB** (more space for logs and uploads)
   - Volume type: **gp3** (General Purpose SSD) or **gp2** (free tier eligible)
   - Delete on termination: **Yes**
   
   💡 **Free Tier Storage:** 30 GB of EBS General Purpose (SSD) or Magnetic storage

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

### AWS Free Credits Usage:
- **Check your credits balance:** AWS Console > Billing Dashboard > Credits
- **Monitor usage:** Set up billing alerts to track credit consumption
- **Stop instance when not in use** to save credits (data persists on EBS)
- **Recommended instance for credits:** t2.medium (~$30-35/month deducted from credits)

### Free Tier Benefits (First 12 months):
- ✅ **750 hours/month** of t2.micro (enough for 24/7 operation)
- ✅ **30 GB** of EBS storage
- ✅ **15 GB** of bandwidth out aggregated across all AWS services
- ✅ **750 hours/month** of RDS db.t2.micro (if you switch to RDS later)

### Estimated Credit Consumption:
- **t2.micro (free tier):** $0/month for first year
- **t2.medium with credits:** ~$30-35/month from your credits
- **t2.large with credits:** ~$60-70/month from your credits
- **30GB storage:** ~$3/month from your credits
- **Data transfer:** Usually free for first 15GB/month

### Tips to Maximize Credits:
1. **Use t2.medium** (good balance of performance and cost)
2. **Stop instance at night** if not needed 24/7:
   ```bash
   # Stop from AWS Console: EC2 > Instances > Instance State > Stop
   # Or use AWS CLI:
   aws ec2 stop-instances --instance-ids i-xxxxxxxxxxxxx
   ```
3. **Use CloudWatch alarms** to auto-stop when idle
4. **Clean up logs** regularly:
   ```bash
   sudo journalctl --vacuum-time=7d
   ```
5. **Monitor credit balance** weekly

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


---

## AWS Credits & Free Tier FAQ

### Q: How do I check my remaining credits?
**A:** AWS Console > Billing Dashboard > Credits
- View total credits
- View expiration date
- View usage by service

### Q: Which instance should I choose with AWS credits?
**A:** 
- **Educational/Testing:** t2.medium (best balance)
- **Production/Demo:** t2.large (better for face recognition)
- **Tight budget:** t2.micro (free tier, but slow)

### Q: How long will my credits last?
**A:** Depends on instance type:
- $100 credits with t2.medium 24/7 = ~3 months
- $100 credits with t2.large 24/7 = ~1.5 months
- $100 credits with t2.medium 8hrs/day = ~9 months

### Q: What happens when credits run out?
**A:** 
1. AWS starts charging your credit card
2. You'll receive email notification when credits are low
3. Set up billing alerts to get notified at 50%, 75%, 90% usage

### Q: Can I upgrade/downgrade instance later?
**A:** Yes!
```bash
# From AWS Console:
1. Stop instance
2. Actions > Instance Settings > Change Instance Type
3. Select new type (t2.micro, t2.medium, t2.large, etc.)
4. Start instance
```

### Q: How to set up billing alerts?
**A:**
1. AWS Console > Billing Dashboard > Billing preferences
2. Enable "Receive Billing Alerts"
3. Go to CloudWatch > Alarms > Create Alarm
4. Set threshold (e.g., alert when charges > $50)
5. Add your email

### Q: Free tier vs AWS Credits - what's the difference?
**A:**
- **Free Tier:** Automatic for first 12 months, limited to t2.micro
- **AWS Credits:** Can use on any instance type, expires based on terms
- **You can use both together!** (Credits applied first, then free tier)

### Q: Best practices for AWS credits?
**A:**
1. ✅ Choose t2.medium or t2.large (your credits cover it)
2. ✅ Monitor usage weekly
3. ✅ Stop instance when not demoing
4. ✅ Set billing alarms at 50% and 80%
5. ✅ Clean up unused resources (snapshots, volumes)
6. ❌ Don't use expensive services (GPU instances, high IOPS storage)

### Q: How to stop/start instance to save credits?
**A:**
```bash
# Stop instance (saves credits, data persists)
AWS Console > EC2 > Select Instance > Instance State > Stop

# Start instance when needed
AWS Console > EC2 > Select Instance > Instance State > Start

# Schedule auto stop/start with Lambda (advanced)
# Stops at 11 PM, starts at 8 AM on weekdays
```

### Q: Will I lose data if I stop the instance?
**A:** No! Data on EBS volumes persists. You only lose:
- RAM contents (obviously)
- Public IP (unless you use Elastic IP - costs extra)
- Active connections/sessions

---

## 🎓 Recommended Setup for AWS Credits

### If you have $50-100 in credits:

**Development/Testing Setup:**
```
Instance: t2.medium
Storage: 30 GB gp3
Region: Your nearest region
Uptime: Stop at night (8AM-11PM = 15hrs/day)
Estimated duration: 6-9 months
```

**Production/Demo Setup:**
```
Instance: t2.large
Storage: 50 GB gp3
Region: Your nearest region
Uptime: 24/7 for demos
Estimated duration: 1.5-2 months
```

### If you have $200+ in credits:

**Full Production Setup:**
```
Instance: t2.large or t3.medium
Storage: 50 GB gp3
Add: RDS PostgreSQL (db.t3.micro)
Add: Elastic IP (static IP)
Add: CloudWatch monitoring
Estimated duration: 3-4 months of 24/7 operation
```

### 💡 Pro Tip:
Start with **t2.medium** and run 24/7 for the first month. If performance is good, keep it. If face recognition is slow during peak loads, upgrade to **t2.large**. Monitor your credit balance weekly!

---

## Instance Size Comparison for Your App

| Instance | vCPU | RAM | Face Recognition | Cost/month | Recommended |
|----------|------|-----|------------------|------------|-------------|
| t2.micro | 1 | 1GB | ⚠️ Slow (30s+) | FREE* | Testing only |
| t2.small | 1 | 2GB | ⚠️ Slow (15s+) | $17 | Not recommended |
| t2.medium | 2 | 4GB | ✅ Good (5-10s) | $34 | **Best for credits** |
| t2.large | 2 | 8GB | ✅ Fast (2-5s) | $68 | Best performance |
| t3.medium | 2 | 4GB | ✅ Good (4-8s) | $30 | Alternative |

*Free tier first 12 months

**Your app needs:**
- PostgreSQL database (~500MB RAM)
- Python backend with face recognition (~1-2GB RAM)
- Node.js frontend (~500MB RAM)
- System + buffers (~500MB RAM)

**Minimum viable:** t2.medium (4GB total)
**Recommended:** t2.large (8GB total) for smooth face recognition

Choose based on your credits balance and demo needs! 🚀
