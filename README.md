# 🍽️ Smart Mid-Day Meal Management System

An AI-powered attendance and meal management system for schools with facial recognition, inventory tracking, and real-time analytics.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
  - [Local Development](#local-development)
  - [AWS EC2 Deployment](#aws-ec2-deployment)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🎯 Core Features
- **AI-Powered Face Recognition Attendance** - Real-time facial recognition using InsightFace
- **Student Management** - Complete CRUD operations with photo upload
- **Attendance Tracking** - Live camera-based attendance with confidence scoring
- **Inventory Management** - Track ingredients, stock levels, and meal planning
- **Daily Meal Management** - Menu planning and meal tracking
- **Reports & Analytics** - Comprehensive dashboards with data visualization
- **Alert System** - Real-time notifications for critical events
- **Role-Based Access Control** - Government Admin and School Admin roles

### 🔐 Security Features
- JWT-based authentication
- Bcrypt password hashing
- CORS protection
- SQL injection prevention
- Secure file uploads

### 🚀 Performance Features
- Face detection with 60% matching threshold for accuracy
- Quality scoring (minimum 50%) to reject poor captures
- Optimized image preprocessing (100-200ms per frame)
- PostgreSQL with pgvector for efficient face encoding storage

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with pgvector extension
- **Face Recognition**: InsightFace (buffalo_l model, 512-dimensional encodings)
- **Computer Vision**: OpenCV
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT + Bcrypt
- **Migrations**: Alembic

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Routing**: React Router v6

### AI/ML
- **Face Detection**: InsightFace (RetinaFace detector)
- **Face Recognition**: ArcFace embeddings (512-d vectors)
- **Similarity**: Cosine similarity matching

## 💻 System Requirements

### Development
- **OS**: Windows 10/11, macOS, or Linux
- **Python**: 3.11 or higher
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14+ with pgvector extension
- **RAM**: 8GB minimum (16GB recommended for face recognition)
- **Storage**: 2GB free space

### Production (AWS EC2)
- **Instance Type**: t3.medium or higher (2 vCPU, 4GB RAM minimum)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 20GB+ EBS volume
- **Network**: Public IP with ports 80, 443, 8000 open

## 🚀 Installation

### Local Development

#### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Disha_project
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Configuration section)
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Seed demo data (optional)
python seed.py

# Start backend server
python main.py
```

Backend will run on `http://localhost:8000`

#### 3. Frontend Setup
```bash
cd frontend-new

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with backend URL

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### AWS EC2 Deployment

#### Prerequisites
- AWS Account
- EC2 instance (Ubuntu 22.04, t3.medium or higher)
- Domain name (optional)
- SSH key pair

#### Quick Deploy Script
```bash
# On your EC2 instance
wget https://raw.githubusercontent.com/YOUR_REPO/main/deploy/deploy-aws.sh
chmod +x deploy-aws.sh
sudo ./deploy-aws.sh
```

Or follow the [detailed deployment guide](./deploy/AWS_DEPLOYMENT.md)

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Application
PROJECT_NAME=Smart Mid-Day Meal System
VERSION=1.0.0
API_V1_STR=/api/v1

# CORS (comma-separated origins)
BACKEND_CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# File Upload
MAX_UPLOAD_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=uploads
```

### Frontend Environment Variables

Create `frontend-new/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api/v1

# For production
# VITE_API_URL=https://api.yourdomain.com/api/v1
```

### Database Setup

1. **Install PostgreSQL with pgvector**:
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE EXTENSION vector;"

# Or use managed PostgreSQL (Neon, AWS RDS, etc.)
```

2. **Create Database**:
```sql
CREATE DATABASE midday_meal_db;
CREATE USER meal_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE midday_meal_db TO meal_admin;
```

3. **Enable pgvector**:
```sql
\c midday_meal_db
CREATE EXTENSION vector;
```

## 📖 Usage

### First Time Setup

1. **Start the backend and frontend** (see Installation)

2. **Access the application**: `http://localhost:5173`

3. **Default credentials**:
   - Email: `admin@school.com`
   - Password: `admin123`

4. **Add Students**:
   - Go to Student Management
   - Click "Add Student"
   - Upload a clear, front-facing photo
   - Face encoding will be generated automatically

5. **Test Face Recognition**:
   - Go to Attendance page
   - Click "Start Camera"
   - Position face in front of camera
   - Green box = Recognized
   - Red box = Not recognized

### Face Recognition Best Practices

✅ **For Best Accuracy**:
- Good lighting (face clearly visible)
- Front-facing pose (avoid side angles)
- Neutral expression
- Clear photo quality
- Consistent environment (similar lighting for enrollment and recognition)

❌ **Avoid**:
- Poor lighting or shadows
- Side profiles
- Hats, masks, or face coverings
- Blurry or low-quality images
- Multiple faces in frame

### Thresholds
- **Face Detection**: 50% quality minimum
- **Matching**: 60% similarity threshold
- **Attendance Marking**: 65% confidence minimum

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### Authentication
```
POST /api/v1/auth/login
POST /api/v1/auth/token
GET  /api/v1/auth/me
```

#### Students
```
GET    /api/v1/students
POST   /api/v1/students
GET    /api/v1/students/{id}
PUT    /api/v1/students/{id}
DELETE /api/v1/students/{id}
```

#### Attendance
```
POST   /api/v1/attendance/detect-faces
POST   /api/v1/attendance/mark-attendance
GET    /api/v1/attendance/today
GET    /api/v1/attendance/statistics/today
```

## 📁 Project Structure

```
Disha_project/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/           # API routes
│   │   ├── core/             # Core config & security
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic (face recognition)
│   ├── uploads/              # User uploaded files
│   ├── main.py               # FastAPI app
│   ├── seed.py               # Demo data seeder
│   └── requirements.txt      # Python dependencies
├── frontend-new/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Utilities (API client)
│   │   └── hooks/            # Custom React hooks
│   ├── public/               # Static assets
│   └── package.json          # Node dependencies
└── deploy/                   # Deployment scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **InsightFace** for the face recognition models
- **FastAPI** for the excellent Python web framework
- **React** and **Vite** for the frontend tooling
- **Neon** for managed PostgreSQL with pgvector

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@yourdomain.com

---

**Built with ❤️ for better school meal management**
