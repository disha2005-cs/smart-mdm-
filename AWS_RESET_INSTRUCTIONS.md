# AWS Database Reset Instructions

## Problem
- Migration errors (tables already exist)
- Student delete fails (face_encoding cascade issue)
- Photos not showing (old students using file paths)

## Solution: Reset Database with Fresh Schema

### Step 1: SSH into AWS
```bash
ssh ubuntu@16.192.185.245
```

### Step 2: Pull Latest Code
```bash
cd ~/smart-mdm-/backend
git pull
source venv/bin/activate
```

### Step 3: Reset Database (DELETES ALL DATA!)
```bash
python3 reset_database.py
```

When prompted, type: `YES`

This will:
- Drop all existing tables
- Create new tables with photo_data columns
- Clean slate for fresh start

### Step 4: Seed Initial Data
```bash
python3 seed.py
```

This creates:
- Government admin: `GOV-001` / `password123`
- Sample school

### Step 5: Start Backend
```bash
# Stop old process
pkill -f main.py

# Start new process
nohup python3 main.py > backend.log 2>&1 &

# Check it's running
tail -f backend.log
```

Press `Ctrl+C` to stop viewing logs

### Step 6: Test Frontend
Open: http://localhost:5173

1. Login with `GOV-001` / `password123`
2. Go to Students page
3. Delete old students (Anivrath, Disha) if they exist
4. Add new students with photos
5. Photos will now be stored in Neon database!
6. Test face recognition attendance

---

## What's Fixed

✅ **Student delete** - Now deletes face_encoding first, then student
✅ **Photo storage** - New students store photos in Neon database (photo_data column)
✅ **Photo endpoint** - Handles both database photos and old file paths
✅ **Clean database** - No more orphaned data or constraint violations

---

## Backend is Running When You See:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

Access at: http://16.192.185.245:8000/docs
