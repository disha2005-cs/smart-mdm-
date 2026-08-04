# 🌐 Ngrok Setup for PM Poshan Application

## Current Issue
You're accessing the frontend through ngrok but the backend is still on localhost, causing authentication issues.

---

## ✅ Solution: Setup Ngrok for Both Services

### Step 1: Setup Backend Ngrok Tunnel

**Terminal 1 - Backend Ngrok:**
```powershell
ngrok http 8000
```

This will give you output like:
```
Forwarding   https://your-backend-url.ngrok-free.app -> http://localhost:8000
```

**Copy the HTTPS URL** (e.g., `https://your-backend-url.ngrok-free.app`)

---

### Step 2: Configure Frontend to Use Backend Ngrok URL

Create a file: `c:\Disha_project\frontend-new\.env`

Add this content (replace with YOUR backend ngrok URL):
```env
VITE_API_URL=https://your-backend-url.ngrok-free.app/api/v1
```

**Example:**
```env
VITE_API_URL=https://abc123.ngrok-free.app/api/v1
```

---

### Step 3: Update Backend CORS Settings

Edit: `c:\Disha_project\backend\main.py`

Find the CORS configuration and update it:

```python
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.ngrok-free.dev",
        "https://*.ngrok.io",
        "https://*.ngrok.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Step 4: Restart Services

**Stop both services (Ctrl+C in each terminal)**

**Terminal 1 - Start Backend:**
```powershell
cd c:\Disha_project\backend
.\venv\Scripts\activate
python main.py
```

**Terminal 2 - Start Backend Ngrok:**
```powershell
ngrok http 8000
```
Copy the HTTPS URL!

**Terminal 3 - Start Frontend (after creating .env file):**
```powershell
cd c:\Disha_project\frontend-new
npm run dev
```

**Terminal 4 - Start Frontend Ngrok:**
```powershell
ngrok http 5173
```

---

## 🎯 Current Status

### What I've Fixed:
1. ✅ Updated `vite.config.ts` to allow ngrok hosts
2. ✅ Updated `api.ts` to use environment variable for API URL
3. ✅ Added support for ngrok domains

### What You Need to Do:

1. **Setup Backend Ngrok:**
   ```powershell
   ngrok http 8000
   ```

2. **Create `.env` file in frontend-new folder:**
   ```
   c:\Disha_project\frontend-new\.env
   ```
   
   Content:
   ```env
   VITE_API_URL=https://YOUR-BACKEND-NGROK-URL.ngrok-free.app/api/v1
   ```

3. **Update backend CORS** (see Step 3 above)

4. **Restart all services**

---

## 🧪 Testing After Setup

1. Open your ngrok frontend URL: `https://hopeless-polly-unexpectably.ngrok-free.dev`
2. Select "School Admin"
3. Login: SCH-001 / password123
4. Should work without errors!

---

## 📝 Quick Reference

**Your Current Frontend Ngrok:**
```
https://hopeless-polly-unexpectably.ngrok-free.dev
```

**You Need to Setup:**
- Backend ngrok tunnel
- Frontend .env file
- Backend CORS settings

---

## ⚠️ Important Notes

- **Ngrok Free URLs change** every time you restart ngrok
- **Update the .env file** whenever backend ngrok URL changes
- **CORS must allow** the ngrok domains
- **Both services** need ngrok tunnels for external access

---

## 🔧 Alternative: Use Localhost

If ngrok setup is too complex, access the app locally:
```
http://localhost:5173
```

Login works perfectly on localhost! ✅

---

## 🆘 Troubleshooting

**Issue:** Still getting blocked
**Solution:** Restart frontend dev server after creating .env file

**Issue:** Login fails on ngrok
**Solution:** Make sure backend ngrok URL is in .env file

**Issue:** CORS errors
**Solution:** Update backend CORS to allow ngrok domains

---

Need help? Check the logs in each terminal window!
