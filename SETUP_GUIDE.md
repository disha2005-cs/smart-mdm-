# Quick Setup Guide

## Initial Setup

### 1. Clone Repository
```bash
git clone YOUR_REPO_URL
cd Disha_project
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
# At minimum, update:
# - DATABASE_URL
# - JWT_SECRET_KEY (generate with: openssl rand -hex 32)
```

#### Setup Database
Make sure PostgreSQL is installed with pgvector extension.

```sql
-- Create database and user
CREATE DATABASE midday_meal_db;
CREATE USER meal_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE midday_meal_db TO meal_admin;

-- Enable pgvector extension
\c midday_meal_db
CREATE EXTENSION vector;
```

Update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://meal_admin:your_password@localhost:5432/midday_meal_db
```

#### Run Migrations
```bash
alembic upgrade head
```

#### Seed Demo Data (Optional)
```bash
python seed.py
```

#### Start Backend Server
```bash
python main.py
```

Backend will run on http://localhost:8000

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend-new
npm install
```

#### Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# For local development, default is fine:
# VITE_API_URL=http://localhost:8000/api/v1
```

#### Start Development Server
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Default Credentials

After seeding demo data:

**School Admin:**
- Email: `admin@school.com`
- Password: `admin123`

**Government Admin:**
- Email: `gov@admin.com`
- Password: `gov123`

⚠️ **Change these passwords in production!**

## First Steps

1. **Login** with default credentials
2. **Add Students** with photos in Student Management
3. **Test Face Recognition** in Attendance page
4. **Update Password** in Settings

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/db` |
| JWT_SECRET_KEY | Secret for JWT tokens | Yes | `openssl rand -hex 32` |
| JWT_ALGORITHM | JWT algorithm | Yes | `HS256` |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token expiry | Yes | `1440` |
| PROJECT_NAME | Application name | No | `Smart Mid-Day Meal System` |
| BACKEND_CORS_ORIGINS | Allowed origins | No | `http://localhost:5173` |

### Frontend (.env)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| VITE_API_URL | Backend API URL | Yes | `http://localhost:8000/api/v1` |

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux:
lsof -i :8000
kill -9 <PID>
```

**Database connection error:**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure pgvector extension is installed

**Module not found:**
```bash
pip install -r requirements.txt
```

### Frontend Issues

**Port 5173 already in use:**
```bash
# Kill process or change port in vite.config.ts
```

**API connection error:**
- Check backend is running on port 8000
- Verify VITE_API_URL in .env

**Build errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [README.md](./README.md) for comprehensive documentation
- Check [AWS_DEPLOYMENT.md](./deploy/AWS_DEPLOYMENT.md) for production deployment
- Review [API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md) for API details

## Getting Help

- Check logs: Backend logs in console, Frontend in browser DevTools
- Review error messages carefully
- Check GitHub issues for similar problems
- Contact support team
