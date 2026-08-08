# 📹 Camera Troubleshooting Guide

## Issue: Camera light on but no video feed

### ✅ FIXES APPLIED:

1. **Added video ready check** - Waits for video metadata to load
2. **Added play() call** - Explicitly starts video playback
3. **Added frame validation** - Checks video dimensions before capture
4. **Added delay** - 500ms delay before starting detection

---

## 🔧 If Video Still Not Showing:

### Step 1: Check Browser Console (F12)

Look for these errors:

**"Failed to execute 'drawImage'"**
→ Video not loaded yet (fixed with our changes)

**"InvalidStateError"**
→ Video element not in correct state (fixed with readyState check)

**"video.play() failed"**
→ Browser autoplay policy (fixed with user gesture)

---

### Step 2: Test Different Resolutions

If high resolution fails, try lower:

**Edit FaceRecognitionCamera.tsx, line 66-70:**

```typescript
// OPTION 1: Try 640x480 (lower resolution)
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'
  }
});

// OPTION 2: Try basic constraints
const stream = await navigator.mediaDevices.getUserMedia({
  video: true
});
```

---

### Step 3: Check Video Element CSS

**Open DevTools (F12) → Elements tab**

Find the `<video>` element and check:

```css
/* Should see: */
width: 100%;
height: 100%;
object-fit: cover;
```

**If video is hidden, check:**
- Parent div has proper size
- No `display: none`
- No `visibility: hidden`
- No `opacity: 0`

---

### Step 4: Manual Video Test

**Open browser console (F12) and paste:**

```javascript
// Get video element
const video = document.querySelector('video');

// Check if stream is attached
console.log('Stream:', video.srcObject);

// Check video dimensions
console.log('Video size:', video.videoWidth, 'x', video.videoHeight);

// Check if playing
console.log('Playing:', !video.paused);

// Try to play manually
video.play().then(() => {
  console.log('Video started!');
}).catch(err => {
  console.error('Play failed:', err);
});
```

**Expected output:**
```
Stream: MediaStream {...}
Video size: 1280 x 720
Playing: true
Video started!
```

---

### Step 5: Check Hardware Acceleration

**Chrome/Edge:**
1. Go to `chrome://settings/system`
2. Make sure "Use hardware acceleration" is enabled
3. Restart browser

**Firefox:**
1. Go to `about:preferences`
2. Search for "hardware acceleration"
3. Enable it
4. Restart browser

---

### Step 6: Try Different Browser

Test in order:
1. Chrome (best support)
2. Edge (Chromium-based)
3. Firefox
4. Safari (Mac only)

---

### Step 7: Check Camera Permissions

**Windows 11:**
1. Open Settings
2. Privacy & Security → Camera
3. Make sure:
   - Camera access is ON
   - Let desktop apps access your camera: ON
   - Browser (Chrome/Edge/Firefox) is allowed

**Windows 10:**
1. Settings → Privacy → Camera
2. Allow apps to access camera: ON
3. Allow desktop apps: ON

---

## 🐛 Common Issues & Solutions

### Issue: Black screen
**Cause**: Video not loaded yet
**Fix**: ✅ Already fixed - added loadedmetadata event

### Issue: Frozen frame
**Cause**: Stream stopped or paused
**Fix**: Check if camera light is on, restart camera

### Issue: Mirror image
**Cause**: Camera is mirrored by default
**Solution**: This is normal for front camera

### Issue: Pixelated/blurry
**Cause**: Low resolution or bad lighting
**Fix**: Improve lighting, check resolution settings

### Issue: Lag/delay
**Cause**: High resolution, slow computer
**Fix**: Lower resolution to 640x480

---

## 🎯 Debug Commands

**Check if camera is working:**
```javascript
navigator.mediaDevices.getUserMedia({video: true})
  .then(stream => {
    console.log('✓ Camera works!');
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('✗ Camera error:', err));
```

**List all cameras:**
```javascript
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log('Cameras found:', cameras.length);
    cameras.forEach((c, i) => console.log(`${i+1}. ${c.label || 'Unknown'}`));
  });
```

**Check video element state:**
```javascript
const video = document.querySelector('video');
console.log({
  hasStream: !!video.srcObject,
  dimensions: `${video.videoWidth}x${video.videoHeight}`,
  readyState: video.readyState, // Should be 4 (HAVE_ENOUGH_DATA)
  paused: video.paused, // Should be false
  muted: video.muted // Should be true
});
```

---

## ✅ Quick Fix Checklist

Run through this:

- [ ] Refresh the page (Ctrl+R)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Restart browser
- [ ] Check camera permissions (Settings → Privacy)
- [ ] Close other apps using camera
- [ ] Try different browser
- [ ] Check hardware acceleration enabled
- [ ] Test with test-camera.html
- [ ] Check DevTools console for errors
- [ ] Try lower resolution (640x480)

---

## 🚨 If Nothing Works

**Last resort fixes:**

1. **Restart computer** (frees all camera resources)

2. **Update camera drivers:**
   - Device Manager → Cameras
   - Right-click camera → Update driver

3. **Reset browser settings:**
   - Clear all site permissions
   - Reset to defaults
   - Restart browser

4. **Test with native app:**
   - Open Windows Camera app
   - If that doesn't work, it's a hardware/driver issue

---

## 📱 Contact Info for Support

If video still doesn't show after all fixes:

1. **Share browser console errors** (F12 → Console tab)
2. **Share video element inspection** (F12 → Elements → find `<video>`)
3. **Share the debug command outputs** (from Debug Commands section)
4. **Share camera test results** (test-camera.html)

This will help pinpoint the exact issue!
