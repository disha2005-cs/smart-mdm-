# Database Reset Instructions

## ⚠️ IMPORTANT WARNING
This script will **DELETE ALL DATA** from your Neon PostgreSQL database. This action cannot be undone!

## What This Script Does
1. Drops all existing tables from the database
2. Recreates all tables with a fresh schema
3. Creates a single Government Admin account with credentials:
   - **Employee ID:** GOV-001
   - **Password:** password123
   - **Role:** Government Administrator

## Prerequisites
- Ensure your backend virtual environment is activated
- Make sure you're in the backend directory

## How to Run

### Step 1: Navigate to Backend Directory
```powershell
cd c:\Disha_project\backend
```

### Step 2: Activate Virtual Environment
```powershell
.\venv\Scripts\Activate
```

### Step 3: Run the Reset Script
```powershell
python reset_database.py
```

### Step 4: Confirmation
When prompted, type exactly: `DELETE EVERYTHING`

## After Reset

### Start the Backend Server
```powershell
python main.py
```

### Login to the Application
1. Open the frontend application
2. Select "Government Portal"
3. Use these credentials:
   - **Employee ID:** GOV-001
   - **Password:** password123

### Next Steps
- From the government dashboard, you can now:
  - Add new schools
  - Create school admin accounts
  - Manage the system from scratch

## What Gets Deleted
- All schools
- All admins (government and school)
- All students
- All attendance records
- All meal records
- All inventory data
- All alerts
- All face encodings

## What Gets Created
- Fresh database schema
- One government admin account (GOV-001)

## Troubleshooting

### If you get a connection error:
- Check that your `.env` file has the correct DATABASE_URL
- Ensure your Neon database is accessible
- Verify your internet connection

### If you get a module import error:
- Make sure your virtual environment is activated
- Run: `pip install -r requirements.txt`

### If tables don't get created:
- Check the terminal output for specific errors
- Ensure all model files are properly imported in `app/models/__init__.py`
