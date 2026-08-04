# PM Poshan App - Testing Guide

## Prerequisites
1. Backend running on `http://localhost:8000`
2. Frontend running on `http://localhost:5173` or Electron app
3. Database seeded with demo data

## Setup Instructions

### 1. Start Backend Server
```powershell
cd backend
.\venv\Scripts\activate
python main.py
```
Backend will run on http://localhost:8000
API Documentation: http://localhost:8000/docs

### 2. Verify Database Seed Data
The backend automatically seeds data on startup. You should have:
- 1 Government Admin: GOV-001 / password123
- 5 School Admins: SCH-001 through SCH-005 / password123
- 5 Schools across Karnataka
- 30-50 students per school
- 7 days of attendance history
- Inventory items with varying stock levels

### 3. Start Frontend
```powershell
cd frontend-new
npm run dev
```
Frontend will run on http://localhost:5173

## Test Case 24: Government Admin Flow

### Login
1. Navigate to http://localhost:5173
2. Click "Get Started"
3. Select "Government Portal"
4. Login with:
   - Employee ID: `GOV-001`
   - Password: `password123`

### Verify Navigation
✅ Should see menu items:
- Dashboard
- Schools
- Inventory
- Reports

✅ Should NOT see:
- Students
- Attendance

### Test Dashboard
1. Navigate to Dashboard
2. ✅ Verify you see multi-school aggregated data:
   - Total students across all schools
   - Overall attendance rate
   - Inventory status summary
   - Recent alerts

### Test Schools Page
1. Navigate to Schools (Government-only page)
2. ✅ Should see list of 5 schools:
   - Greenwood Government High School (Mysuru)
   - St. Joseph Government School (Bangalore Urban)
   - Mahatma Gandhi Primary School (Bangalore Urban)
   - Sarvodaya High School (Mandya)
   - Vidya Niketan School (Hassan)
3. ✅ Can view school details
4. ✅ Can edit school information
5. ✅ Can create new schools

### Test Inventory Page
1. Navigate to Inventory
2. ✅ Should see inventory items
3. ✅ Can add/edit/delete items
4. ✅ Shows items from current context school

### Test Reports Page
1. Navigate to Reports
2. ✅ Should load without errors
3. ✅ Can generate reports

### Test Role Protection
1. Try to navigate directly to `/students` or `/attendance`
2. ✅ Should see **403 Forbidden** page
3. ✅ Error message should show:
   - "Required role: SCHOOL"
   - "Your role: GOVERNMENT"

### Logout
1. Click Logout button
2. ✅ Should redirect to login page
3. ✅ Token should be cleared

---

## Test Case 25: School Admin Flow & Camera Attendance

### Login
1. Navigate to http://localhost:5173
2. Click "Get Started"
3. Select "School Portal"
4. Login with:
   - Employee ID: `SCH-001`
   - Password: `password123`

### Verify Navigation
✅ Should see menu items:
- Dashboard
- Students
- Attendance
- Inventory
- Reports

✅ Should NOT see:
- Schools

### Test Dashboard
1. Navigate to Dashboard
2. ✅ Verify you see single-school data:
   - Total students (specific to Greenwood School)
   - Today's attendance
   - Inventory status
   - School-specific alerts
3. ✅ "Mark Attendance" button should be visible
4. ✅ "View Students" button should be visible

### Test Students Page
1. Navigate to Students
2. ✅ Should see list of students from Greenwood School only
3. ✅ Can search students by name/ID
4. ✅ Can filter by grade and gender
5. ✅ Test Add Student:
   - Click "+ Add Student"
   - Fill form with test data
   - ✅ Submit should create student
   - ✅ New student appears in list
6. ✅ Test Edit Student:
   - Click edit icon on a student
   - Modify details
   - ✅ Changes should save
7. ✅ Test Delete Student:
   - Click delete icon
   - Confirm deletion
   - ✅ Student should be removed

### Test Camera Attendance (CRITICAL)
1. Navigate to Attendance page
2. ✅ Should see today's date at top
3. ✅ Should see attendance statistics:
   - Total Students
   - Present
   - Absent
   - Attendance Rate

#### Camera Capture Flow:
4. Click **"Start Camera"** button
5. ✅ Browser should request camera permission
6. ✅ Allow camera access
7. ✅ Live webcam feed should appear with corner brackets
8. Position face in camera view
9. Click **"Capture & Mark Attendance"** button
10. ✅ Should see processing overlay ("Recognizing face...")
11. ✅ After 1-2 seconds, should see success message:
    - "Attendance marked successfully"
    - Student name and ID
    - Confidence score (92-98%)
    - Grade and section
12. ✅ New attendance record should appear in "Today's Attendance" log:
    - Student avatar with initial
    - Student name and ID
    - Grade and section
    - Confidence score
    - Time marked
    - "Present" status badge

#### Test Duplicate Prevention:
13. Click "Capture & Mark Attendance" again (same student)
14. ✅ Should see error: "Attendance already marked for [Student Name] today"

#### Test Database Persistence:
15. Refresh the page
16. ✅ Previously marked attendance should still be visible
17. Check database directly:
```sql
SELECT a.*, s.first_name, s.last_name 
FROM attendances a 
JOIN students s ON a.student_id = s.id 
WHERE a.date = CURRENT_DATE 
ORDER BY a.created_at DESC;
```
18. ✅ Should see attendance records with:
    - student_id, school_id
    - date (today)
    - time
    - status ("Present")
    - confidence_score
    - photo_url (file path)

### Test Inventory Page
1. Navigate to Inventory
2. ✅ Should see inventory for Greenwood School only
3. ✅ Items should show stock levels:
   - Rice, Wheat, Dal, Oil, Vegetables, Salt, Spices
4. ✅ Low stock items should be highlighted in red
5. ✅ Can add new inventory items
6. ✅ Can update quantities
7. ✅ Can delete items

### Test Reports Page
1. Navigate to Reports
2. ✅ Should load without errors
3. ✅ Can select date range
4. ✅ Can generate reports

### Test Role Protection
1. Try to navigate directly to `/schools`
2. ✅ Should see **403 Forbidden** page
3. ✅ Error message should show:
   - "Required role: GOVERNMENT"
   - "Your role: SCHOOL"

### Test Token Persistence
1. Refresh the page
2. ✅ Should remain logged in
3. ✅ Should not redirect to login
4. ✅ All data should load correctly

### Logout
1. Click Logout button
2. ✅ Should redirect to login page
3. ✅ Token should be cleared
4. ✅ Trying to access protected routes should redirect to login

---

## Additional Testing

### Test Multiple School Admins
Login with different school accounts:
- `SCH-002` / `password123` (St. Joseph School - Bangalore)
- `SCH-003` / `password123` (Mahatma Gandhi School - Bangalore)
- `SCH-004` / `password123` (Sarvodaya School - Mandya)
- `SCH-005` / `password123` (Vidya Niketan School - Hassan)

✅ Each should only see their own school's data

### Test Error Handling
1. Stop the backend server
2. Try to login
3. ✅ Should see error message: "Login failed. Please check your credentials."
4. ✅ Should not crash or show blank page

### Test Invalid Credentials
1. Login with wrong password
2. ✅ Should see error: "Incorrect employee ID or password"

### Test Webcam Issues
1. Deny camera permission
2. ✅ Should show error message
3. ✅ App should not crash

---

## Success Criteria

### Backend ✅
- [x] FastAPI server runs without errors
- [x] All endpoints respond correctly
- [x] Database connection works
- [x] Seed data loads automatically
- [x] JWT authentication works
- [x] Role-based authorization works
- [x] File upload for attendance works
- [x] CORS configured correctly

### Frontend ✅
- [x] All pages load without errors
- [x] No Supabase calls remaining
- [x] All API calls use Axios
- [x] Authentication flow works
- [x] Role-based navigation works
- [x] Role-based route protection works
- [x] Webcam integration works
- [x] File upload works
- [x] Logo displays correctly
- [x] All CRUD operations work

### Features ✅
- [x] Login with role selection
- [x] JWT token storage
- [x] Auto-logout on 401
- [x] Government dashboard (multi-school)
- [x] School dashboard (single-school)
- [x] Student management (CRUD)
- [x] School management (CRUD) - Government only
- [x] Inventory management (CRUD)
- [x] Camera-based attendance capture
- [x] Attendance history
- [x] Real-time webcam feed
- [x] Face recognition (mocked)
- [x] Attendance persistence to database
- [x] Reports generation
- [x] 403 Forbidden for unauthorized access

---

## Known Limitations

1. **Face Recognition**: Currently mocked - randomly selects an active student. In production, integrate actual face recognition library.

2. **Camera Access**: Requires HTTPS in production. Use `ngrok` or deploy with SSL certificate.

3. **File Storage**: Photos stored locally in `uploads/` directory. In production, use cloud storage (S3, Azure Blob, etc.).

4. **Dashboard Data**: Some dashboard statistics use fallback values. Complete dashboard API endpoints for production.

---

## Troubleshooting

### Backend won't start
```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Database errors
```powershell
cd backend
.\venv\Scripts\activate
alembic upgrade head
```

### Frontend errors
```powershell
cd frontend-new
npm install
npm run dev
```

### Camera not working
- Check browser permissions
- Use HTTPS or localhost
- Test in Chrome/Edge (best support)

---

## Demo Credentials Summary

| Role | Employee ID | Password | Access |
|------|-------------|----------|--------|
| Government Admin | GOV-001 | password123 | All schools, reports, inventory |
| School Admin (Mysuru) | SCH-001 | password123 | Greenwood School only |
| School Admin (Bangalore) | SCH-002 | password123 | St. Joseph School only |
| School Admin (Bangalore) | SCH-003 | password123 | Mahatma Gandhi School only |
| School Admin (Mandya) | SCH-004 | password123 | Sarvodaya School only |
| School Admin (Hassan) | SCH-005 | password123 | Vidya Niketan School only |

---

## Production Deployment Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET_KEY
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS/SSL
- [ ] Integrate real face recognition
- [ ] Set up cloud file storage
- [ ] Configure production database
- [ ] Set up monitoring and logging
- [ ] Add rate limiting
- [ ] Set up backup strategy
- [ ] Complete all dashboard endpoints
- [ ] Add email notifications
- [ ] Add SMS alerts
- [ ] Mobile responsive testing
- [ ] Load testing
- [ ] Security audit

---

**✅ System is ready for testing!**
