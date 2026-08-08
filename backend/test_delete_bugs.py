"""
Test script to verify delete bugs are fixed
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_test(message):
    print(f"\n{YELLOW}TEST: {message}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def login_as_gov():
    """Login as government admin"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "employee_id": "GOV-001",
            "password": "password123",
            "role": "GOVERNMENT"
        }
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print_error(f"Failed to login: {response.text}")
        return None

def create_test_school(token):
    """Create a test school"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/schools/",
        headers=headers,
        json={
            "udise_code": "TEST123456",
            "school_name": "Test School for Delete",
            "district": "Bengaluru",
            "taluk": "Bangalore North",
            "village": "Test Village",
            "status": "Active"
        }
    )
    if response.status_code == 201:
        return response.json()
    else:
        print_error(f"Failed to create school: {response.text}")
        return None

def create_test_admin(token, school_id):
    """Create a test admin for the school"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/users/",
        headers=headers,
        json={
            "first_name": "Test",
            "last_name": "Admin",
            "email": f"testadmin{school_id}@test.com",
            "phone": "+91-9999999999",
            "password": "testpass123",
            "school_id": school_id
        }
    )
    if response.status_code == 201:
        return response.json()
    else:
        print_error(f"Failed to create admin: {response.text}")
        return None

def try_login_as_school_admin(employee_id, password):
    """Try to login as school admin"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "employee_id": employee_id,
            "password": password,
            "role": "SCHOOL"
        }
    )
    return response

def delete_school(token, school_id):
    """Delete a school"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/schools/{school_id}",
        headers=headers
    )
    return response

def check_admin_exists(token, employee_id):
    """Check if admin still exists"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/users/",
        headers=headers
    )
    if response.status_code == 200:
        users = response.json()
        for user in users:
            if user["employee_id"] == employee_id:
                return True
    return False

def main():
    print("\n" + "="*60)
    print("Testing School & Admin Delete Bug Fixes")
    print("="*60)

    # Step 1: Login as gov admin
    print_test("Login as Government Admin")
    token = login_as_gov()
    if not token:
        print_error("Cannot proceed without login")
        return
    print_success("Logged in successfully")

    # Step 2: Create test school
    print_test("Create test school")
    school = create_test_school(token)
    if not school:
        print_error("Cannot proceed without school")
        return
    print_success(f"Created school: {school['school_name']} (ID: {school['id']})")

    # Step 3: Create admin for the school
    print_test("Create admin for the school")
    admin = create_test_admin(token, school['id'])
    if not admin:
        print_error("Cannot proceed without admin")
        return
    employee_id = admin['employee_id']
    password = admin['password']
    print_success(f"Created admin: {employee_id}")

    # Step 4: Verify admin can login
    print_test("Verify admin can login")
    login_response = try_login_as_school_admin(employee_id, password)
    if login_response.status_code == 200:
        print_success(f"Admin {employee_id} can login successfully")
    else:
        print_error(f"Admin cannot login: {login_response.text}")

    # Step 5: Delete the school
    print_test("Delete the school (should also delete admin)")
    delete_response = delete_school(token, school['id'])
    if delete_response.status_code == 204:
        print_success("School deleted successfully")
    else:
        print_error(f"Failed to delete school: {delete_response.text}")
        return

    # Step 6: Verify admin no longer exists in database
    print_test("Verify admin is deleted from database")
    admin_exists = check_admin_exists(token, employee_id)
    if not admin_exists:
        print_success(f"Admin {employee_id} no longer exists in database ✓")
    else:
        print_error(f"BUG: Admin {employee_id} still exists in database!")

    # Step 7: Try to login with deleted admin credentials
    print_test("Try to login with deleted admin credentials (should fail)")
    login_response = try_login_as_school_admin(employee_id, password)
    if login_response.status_code != 200:
        error_detail = login_response.json().get('detail', 'Unknown error')
        print_success(f"Login correctly blocked: {error_detail}")
    else:
        print_error("BUG: Deleted admin can still login!")

    print("\n" + "="*60)
    print("Test Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
