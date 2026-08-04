# 🌐 Complete Ngrok Setup for PM Poshan

## Your Frontend Ngrok URL:
```
https://hopeless-polly-unexpectably.ngrok-free.dev/
```

---

## 📋 Step-by-Step Setup (5 minutes)

### Step 1: Start Backend Ngrok Tunnel

**Open a NEW PowerShell/Terminal window** and run:

```powershell
cd c:\Disha_project
ngrok http 8000
```

You'll see output like:
```
Forwarding   https://abc-123-xyz.ngrok-free.app -> http://localhost:8000
```

**COPY THE HTTPS URL!** (Example: `https://abc-123-xyz.ngrok-free.app`)

⚠️ **KEEP THIS WINDOW OPEN!** Don't close it.

---

### Step 2: Create Frontend .env File

Create a new file: `c:\Disha_project\frontend-new\.env`

**Paste this content** (replace with YOUR backend ngrok URL from Step 1):

```env
VITE_API_URL=https://YOUR-BACKEND-URL-HERE.ngrok-free.app/api/v1
```

**Real Example:**
```env
VITE_API_URL=https://abc-123-xyz.ngrok-free.app/api/v1
```

**How to create the file:**

**Option A - Using Notepad:**
1. Open Notepad
2. Paste the content above (with YOUR URL)
3. Save As: `c:\Disha_project\frontend-new\.env`
4. Change "Save as type" to "All Files"
5. Click Save

**Option B - Using PowerShell:**
```powershell
cd c:\Disha_project\frontend-new
notepad .env
# Paste the content, save and close
```

---

### Step 3: Restart Frontend

In your frontend terminal, press **Ctrl+C** to stop, then run:

```powershell
cd c:\Disha_project\frontend-new
npm run dev
```

Wait for it to start (about 10 seconds).

---

### Step 4: Update Frontend Ngrok (if needed)

If your frontend is on port 5174 (check the npm output), update your ngrok:

**Open ANOTHER PowerShell window:**
```powershell
ngrok http 5174
```

Or if it's on port 5173:
```powershell
ngrok http 5173
```

Use the HTTPS URL ngrok gives you for the frontend.

---

## ✅ Test It!

1. Open: `https://hopeless-polly-unexpectably.ngrok-free.dev/`
2. Select "School Admin"
3. Login: **SCH-001** / **password123**
4. Click "Meal Management" - should work!

---

## 📝 What You Need Running:

✅ **4 Terminal Windows:**

1. **Backend Server**
   ```powershell
   cd c:\Disha_project\backend
   .\venv\Scripts\activate
   python main.py
   ```

2. **Backend Ngrok**
   ```powershell
   ngrok http 8000
   ```

3. **Frontend Server**
   ```powershell
   cd c:\Disha_project\frontend-new
   npm run dev
   ```

4. **Frontend Ngrok**
   ```powershell
   ngrok http 5174
   # (or 5173, check which port frontend is using)
   ```

---

## 🎯 Quick Summary

1. ✅ Backend running on port 8000
2. ✅ Backend CORS updated (already done by me)
3. ✅ Vite config updated (already done by me)
4. ⚠️ **YOU NEED TO DO:**
   - Start backend ngrok → Copy URL
   - Create `.env` file with backend ngrok URL
   - Restart frontend
   - Your friend can access your ngrok URL!

---

## 🔗 Share With Your Friend

Send them:
```
URL: https://hopeless-polly-unexpectably.ngrok-free.dev/
School Admin: SCH-001 / password123
Government Admin: GOV-001 / password123
```

---

## ⚠️ Important Notes

- **Ngrok URLs change** every time you restart ngrok (unless you have paid plan)
- **Keep all 4 terminals open** while your friend is testing
- **Backend ngrok URL must be in .env file** for login to work
- **Don't close any terminal windows** or the app will stop working

---

## 🆘 Troubleshooting

**Problem:** Login fails on ngrok
**Solution:** Check that `.env` file has correct backend ngrok URL

**Problem:** Still shows blank page
**Solution:** Restart frontend after creating .env file

**Problem:** CORS error
**Solution:** Backend CORS is already configured, just restart backend

---

**Ready? Start with Step 1!** 🚀
