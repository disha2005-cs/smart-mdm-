# Testing Guide - Face Recognition Attendance System

## Quick Test Steps

### 1. Start Backend
```bash
cd backend
.\venv\Scripts\activate
python main.py
```
Backend should run on: `http://localhost:8000`

### 2. Start Frontend
```bash
cd frontend-new
npm run dev
```
Frontend should run on: `http://localhost:5173`

### 3. Login
- Use your school admin credentials
- Role: SCHOOL

### 4. Add a Test Student
1. Go to **Student Management**
2. Click **Add Student**
3. Fill in required fields:
   - Student ID: `TEST001`
   - First Name: `Test`
   - Last Name: `Student`
   - Gender: Select any
   - Date of Birth: Pick any date
   - Grade: Select any
   - Section: Select any
4. **Upload Photo**: Choose a clear, front-facing photo
5. Click **Save**
6. Wait for success message
7. Verify face encoding was generated (check backend logs)

### 5. Test Face Recognition
1. Go to **Attendance** page
2. Click **Start Camera**
3. Grant camera permissions if asked
4. Position your face (or the person from the photo) in front of camera
5. Wait 1-2 seconds for detection

**Expected Results:**
- Green bounding box appears around face
- Student name shows above box
- Student details card appears below camera
- Confidence score displayed (should be > 40%)
- "Mark Present" button appears

### 6. Mark Attendance
1. Click **Mark Present** button
2. Wait for processing

**Expected Results:**
- Success message: "Attendance marked for [Name] (Confidence: XX.X%)"
- Camera stops automatically after 3 seconds
- New record appears in "Today's Attendance" log
- Record shows:
  - Student avatar
  - Student name
  - Student ID
  - Grade and section
  - Confidence score in green
  - Time marked
  - "PRESENT" status badge

### 7. Test Duplicate Prevention
1. Start camera again
2. Let it detect the same face
3. Click **Mark Present** again

**Expected Result:**
- Error message: "Attendance already marked for [Name] today at [Time]"
- No duplicate record created

### 8. Test Unknown Face
1. Show a different person's face (not registered)
2. Wait for detection

**Expected Result:**
- Red bounding box appears
- "Face not recognized" message
- No "Mark Present" button

### 9. Verify Latest 10 Records
1. Mark attendance for multiple students (if available)
2. Check that only latest 10 records show
3. Records should be ordered by most recent first

---

## Troubleshooting

### Camera Not Starting
- Check browser permissions
- Ensure camera is not in use by another app
- Try a different browser (Chrome recommended)

### Face Not Detected
- Ensure good lighting
- Face the camera directly
- Move closer to camera
- Wait at least 1 second between frames

### Face Not Recognized
- Check if student photo was uploaded properly
- Verify face encoding was generated (backend logs)
- Ensure photo is clear and front-facing
- Adjust threshold if needed (currently 0.4 = 40%)

### Backend Errors
Check logs for:
- InsightFace model loading issues
- Database connection errors
- File upload/storage issues

### Frontend Errors
Check console for:
- API connection errors
- CORS issues
- Camera access errors

---

## Success Criteria

✅ Camera starts and shows live feed
✅ Face detection runs continuously (every 1 second)
✅ Bounding boxes drawn correctly (green/red)
✅ Student info displayed when matched
✅ Confidence scores shown
✅ Attendance marked successfully
✅ Duplicate prevention working
✅ Latest 10 records displayed
✅ Auto-refresh after marking
✅ Photo saved in uploads folder
✅ Database records created properly

---

## Backend API Testing (Optional)

### Test Face Detection Endpoint
```bash
# Get a base64 image first, then:
curl -X POST http://localhost:8000/api/v1/attendance/detect-faces \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"frame": "data:image/jpeg;base64,..."}'
```

### Test Mark Attendance Endpoint
```bash
curl -X POST http://localhost:8000/api/v1/attendance/mark-attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"frame": "data:image/jpeg;base64,..."}'
```

### Get Today's Attendance
```bash
curl http://localhost:8000/api/v1/attendance/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- **Threshold**: Currently set to 0.4 (40% similarity)
- **Detection Interval**: 1 second
- **Encoding Size**: 512 dimensions
- **Model**: InsightFace buffalo_l
- **Image Storage**: `uploads/attendance/{date}/`
- **Photo Format**: JPEG

---

## System is Ready! 🎉

If all tests pass, the face recognition attendance system is fully operational and ready for production use.
