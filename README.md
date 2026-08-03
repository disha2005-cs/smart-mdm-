# Poshan AI - Smart Mid-Day Meal Management System

Desktop application for managing mid-day meal programs with AI-powered features.

## 🚀 Features

- **Desktop Application** - Built with React + Electron
- **Government & School Portals** - Separate interfaces for different users
- **Dashboard** - Real-time statistics and monitoring
- **Student Management** - Registration and tracking
- **Attendance System** - Camera-based attendance (with face detection ready)
- **Inventory Management** - IoT-ready stock tracking
- **Reports & Analytics** - Data visualization and export

## 📋 Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- Windows 10/11

## 🛠️ Installation

### Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend-new
npm install
npm run electron:dev
```

## 🎯 Usage

1. Start the backend server (runs on port 8000)
2. Start the Electron desktop app
3. Choose your portal (Government or School)
4. Login and access the dashboard

## 📦 Build for Production

```bash
cd frontend-new
npm run build
npm run electron:build
```

This creates an installable .exe file in the `dist` folder.

## 🏗️ Project Structure

```
Disha_project/
├── frontend-new/     # React + Electron desktop app
├── backend/          # FastAPI Python backend
├── database/         # Database files
└── docs/             # Documentation
```

## 🔧 Tech Stack

**Frontend:**
- React 19.2 + TypeScript
- Electron 43.2
- React Router
- Axios

**Backend:**
- FastAPI (Python)
- SQLAlchemy
- SQLite

## 📝 License

Government of Karnataka

## 👥 Contributors

Smart Mid-Day Meal Management Team
