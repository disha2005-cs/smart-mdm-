# Smart Mid-Day Meal Management System

A comprehensive system for managing mid-day meal programs in schools with AI-powered face recognition for attendance tracking.

## Features

- **Face Recognition Attendance**: Automatic student attendance using facial recognition
- **Student Management**: Add, edit, and manage student records with photos
- **School Administration**: Multi-school support with role-based access
- **Inventory Management**: Track meal ingredients and supplies
- **Dashboard & Reports**: Real-time statistics and attendance reports
- **Government Portal**: Monitor multiple schools from central dashboard

## Tech Stack

**Backend:**
- Python 3.12
- FastAPI
- PostgreSQL with pgvector
- Face Recognition (dlib)
- SQLAlchemy ORM

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS
- Axios

## Installation

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 14+ (or use Neon DB cloud)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/smart-mdm-.git
cd smart-mdm-
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Edit .env and add your database URL
# DATABASE_URL=postgresql://user:password@localhost/dbname
# JWT_SECRET_KEY=your-secret-key-here

# Run database migrations
alembic upgrade head

# Seed initial data (creates admin user)
python seed.py

# Start the backend server
python main.py
```

Backend will run on `http://localhost:8000`

**Default Admin Credentials:**
- Government Admin: `GOV-001` / `password123`

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend-new

# Install dependencies
npm install

# Create .env file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Edit .env and set backend URL
# VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/docs` (Swagger UI)

## Project Structure

```
smart-mdm-/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── core/             # Core configs
│   │   ├── models/           # Database models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic
│   ├── uploads/              # File uploads
│   ├── main.py               # FastAPI app entry
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
└── frontend-new/
    ├── src/
    │   ├── components/       # React components
    │   ├── pages/            # Page components
    │   ├── lib/              # Utilities
    │   └── types/            # TypeScript types
    ├── package.json          # Node dependencies
    └── .env                  # Frontend config
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend (.env)

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api/v1
```

## Usage

### Adding Students

1. Login as School Admin
2. Navigate to "Students" page
3. Click "Add Student"
4. Fill in student details and upload a clear photo
5. Face encoding will be generated automatically

### Marking Attendance

1. Navigate to "Attendance" page
2. Click "Start Camera"
3. Allow camera permissions
4. Students will be automatically recognized and attendance marked

### Viewing Reports

1. Navigate to "Dashboard" for daily statistics
2. Use "Reports" page for detailed attendance reports
3. Filter by date range and generate exports

## Camera Requirements

- **HTTPS Required**: Camera access requires HTTPS in production
- For local development, use `http://localhost:5173`
- For production/sharing, use ngrok or deploy with SSL certificate

## API Documentation

Once the backend is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Troubleshooting

### Face Recognition Not Working

1. Ensure student photos are clear and well-lit
2. Check that face encodings were generated (re-upload photo if needed)
3. Verify camera permissions are granted
4. Ensure backend face recognition service is running

### Database Connection Error

1. Check PostgreSQL is running
2. Verify DATABASE_URL in backend/.env
3. Ensure database exists and is accessible
4. Run migrations: `alembic upgrade head`

### Port Already in Use

```bash
# Backend (port 8000)
# Windows: netstat -ano | findstr :8000
# Linux/Mac: lsof -i :8000

# Frontend (port 5173)
# Windows: netstat -ano | findstr :5173
# Linux/Mac: lsof -i :5173
```

## Building for Production

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py  # Or use gunicorn/uvicorn
```

### Frontend

```bash
cd frontend-new
npm run build
npm run preview  # Test production build
# Or serve with: npx http-server dist -p 5173
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: your-email@example.com

---

Built with ❤️ for better school meal management
