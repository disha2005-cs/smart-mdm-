# 🍱 PM Poshan - Smart Mid-Day Meal Management System

A comprehensive desktop application for managing India's PM Poshan (Mid-Day Meal) program with AI-powered face recognition, real-time attendance tracking, and automated meal planning.

## ✨ Features

### Government Admin Portal
- 📊 State-wide dashboard with analytics
- 🏫 School management (CRUD operations)
- 🌾 Food allocation management
- 💰 Budget allocation & tracking
- 📦 Multi-school inventory monitoring
- 📈 Advanced reports & analytics
- 🔔 Notifications & alerts
- 👥 User & role management

### School Admin Portal
- 📊 School-specific dashboard
- 👨‍🎓 Student management with face registration
- 📸 AI-powered attendance tracking
- 🍽️ Automated meal calculation
- 📦 Inventory management
- 📄 Custom reports generation
- 🔔 Real-time notifications

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Installation

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd Disha_project
```

**2. Setup Backend**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

**3. Setup Frontend**
```bash
cd frontend-new
npm install
```

### Running the Application

**Option 1: Desktop App (Electron)**

Start Backend:
```bash
cd backend
.\venv\Scripts\activate
python main.py
```

Start Desktop App:
```bash
cd frontend-new
npm start
```

**Option 2: Web Browser**

Start Backend:
```bash
cd backend
.\venv\Scripts\activate
python main.py
```

Start Frontend:
```bash
cd frontend-new
npm run dev
```

Open browser: `http://localhost:5173`

## 🔑 Default Credentials

### Government Admin
```
Employee ID: GOV-001
Password: password123
```

### School Admin
```
Employee ID: SCH-001
Password: password123
```

Additional school admins: SCH-002 to SCH-005 (same password)

## 🗄️ Database

The application uses SQLite for development with pre-seeded data:
- 1 Government Admin
- 5 School Admins
- 5 Schools
- 162 Students
- Sample attendance and inventory records

Database file: `backend/app.db`

## 📁 Project Structure

```
Disha_project/
├── backend/              # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/      # API endpoints
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── core/        # Config & security
│   ├── alembic/         # Database migrations
│   └── main.py          # Application entry point
│
├── frontend-new/        # React Frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # API client & utilities
│   └── electron/        # Electron main process
│
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI
- **Database:** SQLite (dev) / PostgreSQL (production ready)
- **ORM:** SQLAlchemy
- **Auth:** JWT tokens with bcrypt
- **API Docs:** OpenAPI/Swagger

### Frontend
- **Framework:** React 19 + TypeScript
- **Routing:** React Router v7
- **Styling:** TailwindCSS
- **Desktop:** Electron
- **Charts:** Recharts
- **Icons:** Lucide React

## 🔐 Security Features

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control (RBAC)
- CORS protection
- SQL injection prevention
- XSS protection

## 📊 Key Modules

### Attendance System
- Manual attendance entry
- Face recognition support (AI-ready)
- Historical tracking
- Analytics & reporting

### Meal Management
- Automatic meal calculation based on attendance
- Ingredient requirement computation
- Weekly meal planning
- Nutritional standards compliance

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Consumption monitoring
- Multi-school visibility (Government)

### Reports & Analytics
- Daily/Weekly/Monthly reports
- Attendance trends
- Budget utilization
- Export to PDF/Excel

## 🌐 API Documentation

When backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🔧 Configuration

### Backend Configuration
Edit `backend/app/core/config.py`:
- Database URL
- JWT settings
- CORS origins

### Frontend Configuration
Edit `frontend-new/.env`:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 📦 Building for Production

### Build Electron Desktop App
```bash
cd frontend-new
npm run electron:build
```

Output: Installable `.exe` file in `frontend-new/dist`

### Build Web App
```bash
cd frontend-new
npm run build
```

Output: Static files in `frontend-new/dist`

## 🧪 Testing

Login to both portals and test:
1. ✅ Dashboard loads with data
2. ✅ Create/Edit/Delete operations work
3. ✅ Navigation between pages
4. ✅ Role-based access control
5. ✅ Reports generation

## 🐛 Troubleshooting

**Login fails:**
- Ensure backend is running on port 8000
- Check `.env` file has correct API URL

**Port already in use:**
- Frontend uses port 5173 (or 5174 if 5173 is busy)
- Backend uses port 8000

**Database errors:**
- Delete `backend/app.db` and restart backend (auto-creates new DB)

## 📝 Development Notes

- Backend auto-reloads on code changes
- Frontend has hot module replacement (HMR)
- Database migrations use Alembic
- Seed data runs automatically on first start

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is developed for PM Poshan (Mid-Day Meal) scheme management.

## 👥 Credits

Developed as part of India's PM Poshan initiative for smart meal management in schools.

---

**Made with ❤️ for better nutrition management in schools**
