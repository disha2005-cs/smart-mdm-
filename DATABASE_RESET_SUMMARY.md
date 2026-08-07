# 🔄 Database Reset - Complete Guide

## Overview
A Python script has been created to completely reset your Neon PostgreSQL database and start fresh with only a government admin account.

## Files Created
1. **`backend/reset_database.py`** - The main reset script
2. **`backend/RESET_DATABASE_INSTRUCTIONS.md`** - Detailed instructions

## Quick Start

### Run These Commands:
```powershell
# Navigate to backend
cd c:\Disha_project\backend

# Activate virtual environment
.\venv\Scripts\Activate

# Run the reset script
python reset_database.py
```

### When Prompted:
Type exactly: **`DELETE EVERYTHING`**

## What Happens

### ❌ Gets Deleted:
- All schools
- All admins (both government and school)
- All students
- All attendance records
- All meal records
- All inventory data
- All alerts
- All face encodings

### ✅ Gets Created:
- Fresh, empty database tables
- One Government Admin account:
  ```
  Employee ID: GOV-001
  Password: password123
  Email: gov.admin@pmposhan.gov.in
  Designation: State Officer - PM POSHAN Karnataka
  ```

## After Reset - Login

1. **Start Backend:**
   ```powershell
   cd c:\Disha_project\backend
   .\venv\Scripts\Activate
   python main.py
   ```

2. **Start Frontend:**
   ```powershell
   cd c:\Disha_project\frontend-new
   npm run dev
   ```

3. **Login:**
   - Open browser to frontend URL
   - Select "Government Portal"
   - Employee ID: `GOV-001`
   - Password: `password123`

## Next Steps After Login

As a Government Admin, you can now:
1. ✅ Add new schools through "School Management"
2. ✅ Create school admin accounts for each school
3. ✅ Monitor all schools from the government dashboard
4. ✅ Allocate food and budget
5. ✅ Generate reports

**Note:** School admins are NOT created during reset. You'll need to add them through the government portal.

## Important Notes

⚠️ **This is a destructive operation** - All data will be permanently deleted

✅ **Neon Database** - Uses your existing Neon PostgreSQL connection

🔐 **Secure** - Password is properly hashed using bcrypt

🎯 **Clean Start** - Perfect for resetting to a production-ready state

## Troubleshooting

### Connection Issues:
- Verify `.env` file has correct `DATABASE_URL`
- Check internet connection to Neon
- Ensure Neon database is not suspended

### Import Errors:
```powershell
pip install -r requirements.txt
```

### Permission Errors:
- Make sure virtual environment is activated
- Run PowerShell as Administrator if needed

## Safety Features

- Requires explicit confirmation: `DELETE EVERYTHING`
- Shows clear warnings before execution
- Provides detailed output during operation
- Commits only if all operations succeed

## Support

If you encounter any issues:
1. Check the terminal output for specific error messages
2. Verify all model imports in `app/models/__init__.py`
3. Ensure database connection string is correct
4. Make sure all dependencies are installed

---

**Ready to reset?** Follow the Quick Start section above! 🚀
