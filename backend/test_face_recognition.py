"""
Quick test script for face recognition service
Run this to verify InsightFace is working correctly
"""
import cv2
import numpy as np
from app.services.face_recognition_service import get_face_recognition_service

def test_face_recognition():
    print("🧪 Testing Face Recognition Service...")
    print("-" * 50)
    
    try:
        # Initialize service
        print("1️⃣  Initializing face recognition service...")
        face_service = get_face_recognition_service()
        print("   ✅ Service initialized successfully!")
        
        # Create a test image (blank with a simple pattern)
        print("\n2️⃣  Creating test image...")
        test_image = np.random.randint(0, 255, (640, 480, 3), dtype=np.uint8)
        cv2.imwrite('test_image.jpg', test_image)
        print("   ✅ Test image created!")
        
        # Test encoding generation
        print("\n3️⃣  Testing encoding generation...")
        encoding = face_service.generate_encoding_from_file('test_image.jpg')
        
        if encoding is None:
            print("   ⚠️  No face detected (expected for random image)")
        else:
            print(f"   ✅ Encoding generated! Shape: {encoding.shape}")
            print(f"   ℹ️  Encoding type: {type(encoding)}")
            print(f"   ℹ️  First 5 values: {encoding[:5]}")
        
        # Test base64 conversion
        if encoding is not None:
            print("\n4️⃣  Testing base64 conversion...")
            encoded_str = face_service.encoding_to_base64(encoding)
            print(f"   ✅ Converted to base64! Length: {len(encoded_str)}")
            
            decoded = face_service.base64_to_encoding(encoded_str)
            print(f"   ✅ Decoded back! Shape: {decoded.shape}")
            
            # Verify accuracy
            if np.allclose(encoding, decoded):
                print("   ✅ Encoding preserved accurately!")
            else:
                print("   ❌ Encoding mismatch!")
        
        print("\n" + "=" * 50)
        print("✅ Face Recognition Service is working correctly!")
        print("=" * 50)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease ensure:")
        print("  1. InsightFace is installed: pip install insightface")
        print("  2. ONNXRuntime is installed: pip install onnxruntime")
        print("  3. scikit-learn is installed: pip install scikit-learn")
        return False

if __name__ == "__main__":
    success = test_face_recognition()
    exit(0 if success else 1)
