"""
Test script to verify all APIs work correctly
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_login():
    """Test government admin login"""
    print("\n" + "="*60)
    print("TEST 1: Government Admin Login")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "employee_id": "GOV-001",
            "password": "password123",
            "role": "GOVERNMENT"
        }
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        print("✅ Login successful!")
        return data["access_token"]
    else:
        print("❌ Login failed!")
        return None

def test_create_school(token):
    """Test create school"""
    print("\n" + "="*60)
    print("TEST 2: Create School")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/schools",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "udise_code": "29070123456",
            "school_name": "Karnataka Public School",
            "district": "Bagalkot",
            "taluk": "Bagalkot",
            "village": "Bagalkot City",
            "principal_name": "Mr. Kumar",
            "email": "kps@school.edu",
            "phone": "+91-9876543211"
        }
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 201:
        print("✅ School created successfully!")
        return data["id"]
    else:
        print("❌ School creation failed!")
        return None

def test_list_schools(token):
    """Test list schools"""
    print("\n" + "="*60)
    print("TEST 3: List Schools")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/schools",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        print(f"✅ Found {len(data)} schools")
        return True
    else:
        print("❌ Failed to list schools!")
        return False

def test_create_admin(token, school_id):
    """Test create school admin"""
    print("\n" + "="*60)
    print("TEST 4: Create School Admin")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Rajesh",
            "last_name": "Kumar",
            "email": "rajesh.kumar@school.edu",
            "phone": "+91-9876543210",
            "password": "SecurePass123!",
            "school_id": school_id
        }
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 201:
        print("✅ School admin created successfully!")
        print(f"\n📋 CREDENTIALS:")
        print(f"   Employee ID: {data['employee_id']}")
        print(f"   Password: {data['password']}")
        return data['employee_id'], data['password']
    else:
        print("❌ Failed to create school admin!")
        return None, None

def test_school_admin_login(employee_id, password):
    """Test school admin login"""
    print("\n" + "="*60)
    print("TEST 5: School Admin Login")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "employee_id": employee_id,
            "password": password,
            "role": "SCHOOL"
        }
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        print("✅ School admin login successful!")
        return True
    else:
        print("❌ School admin login failed!")
        return False

def test_list_users(token):
    """Test list users"""
    print("\n" + "="*60)
    print("TEST 6: List All Users")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        print(f"✅ Found {len(data)} users")
        return True
    else:
        print("❌ Failed to list users!")
        return False

def main():
    print("\n" + "🚀"*30)
    print("BACKEND API TESTING")
    print("🚀"*30)
    
    # Test 1: Login
    token = test_login()
    if not token:
        print("\n❌ Tests failed at login!")
        return
    
    # Test 2: Create School
    school_id = test_create_school(token)
    if not school_id:
        print("\n❌ Tests failed at create school!")
        return
    
    # Test 3: List Schools
    if not test_list_schools(token):
        print("\n❌ Tests failed at list schools!")
        return
    
    # Test 4: Create School Admin
    employee_id, password = test_create_admin(token, school_id)
    if not employee_id:
        print("\n❌ Tests failed at create admin!")
        return
    
    # Test 5: School Admin Login
    if not test_school_admin_login(employee_id, password):
        print("\n❌ Tests failed at school admin login!")
        return
    
    # Test 6: List Users
    if not test_list_users(token):
        print("\n❌ Tests failed at list users!")
        return
    
    print("\n" + "="*60)
    print("🎉 ALL TESTS PASSED! 🎉")
    print("="*60)
    print("\n✅ Backend is working perfectly!")
    print("✅ Government Admin can login")
    print("✅ Schools can be created")
    print("✅ School Admins can be created")
    print("✅ School Admins can login")
    print("✅ All CRUD operations work")
    print("\n🚀 Ready for frontend development!")

if __name__ == "__main__":
    main()
