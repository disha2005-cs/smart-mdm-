# 🚀 Quick Start Guide

## Step 1: Reset Database (5 minutes)

```powershell
cd c:\Disha_project\backend
.\venv\Scripts\Activate
python reset_database.py
```

Type: `DELETE EVERYTHING`

✅ **Result:** Fresh database with GOV-001 admin created

---

## Step 2: Start Backend (1 minute)

```powershell
python main.py
```

✅ **Running at:** http://localhost:8000

---

## Step 3: Test APIs (10 minutes)

### 3.1 Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"GOV-001","password":"password123","role":"GOVERNMENT"}'
```

Copy the `access_token`

### 3.2 Create School
```bash
curl -X POST http://localhost:8000/api/v1/schools \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "udise_code":"29070123456",
    "school_name":"Karnataka Public School",
    "district":"Bagalkot",
    "taluk":"Bagalkot",
    "village":"Bagalkot City",
    "principal_name":"Mr. Kumar",
    "email":"kps@school.edu",
    "phone":"+91-9876543211"
  }'
```

### 3.3 Create School Admin
```bash
curl -X POST http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Rajesh",
    "last_name":"Kumar",
    "email":"rajesh@school.edu",
    "phone":"+91-9876543210",
    "password":"SecurePass123!",
    "school_id":1
  }'
```

**Response shows:**
- Employee ID: `SCH-KA-BAG-001`
- Password: `SecurePass123!`

### 3.4 Test School Admin Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"SCH-KA-BAG-001","password":"SecurePass123!","role":"SCHOOL"}'
```

✅ **If you get a token, everything works!**

---

## Step 4: View API Docs (Optional)

Open browser: http://localhost:8000/docs

Interactive Swagger UI with all endpoints!

---

## 📋 Key Credentials

| Role | Employee ID | Password |
|------|-------------|----------|
| Government Admin | GOV-001 | password123 |
| School Admin (after creation) | SCH-KA-BAG-001 | SecurePass123! |

---

## ✅ Success Checklist

- [ ] Database reset completed
- [ ] Backend starts without errors
- [ ] Government admin can login
- [ ] School created successfully
- [ ] School admin created successfully
- [ ] School admin can login
- [ ] Ready to build frontend!

---

## 🆘 Troubleshooting

### Database Connection Error
- Check `.env` file has correct `DATABASE_URL`
- Verify Neon database is accessible

### Import Errors
```powershell
pip install -r requirements.txt
```

### Port Already in Use
Stop other processes on port 8000 or change port:
```powershell
uvicorn main:app --port 8001
```

---

## 📚 Full Documentation

- **API_DOCUMENTATION.md** - Complete API reference
- **IMPLEMENTATION_COMPLETE.md** - Detailed implementation guide
- **RESET_DATABASE_INSTRUCTIONS.md** - Database reset guide

---

**Ready? Run Step 1!** 🚀
